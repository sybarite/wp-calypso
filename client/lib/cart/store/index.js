/** @format */
/**
 * External dependencies
 */
import { assign, flow, flowRight, partialRight } from 'lodash';

/**
 * Internal dependencies
 */
import { action as UpgradesActionTypes } from 'lib/upgrades/constants';
import emitter from 'lib/mixins/emitter';
import cartSynchronizer from './cart-synchronizer';
import PollerPool from 'lib/data-poller';
import { recordEvents } from './cart-analytics';
import productsListFactory from 'lib/products-list';
const productsList = productsListFactory();
import Dispatcher from 'dispatcher';
import { applyCoupon, cartItems, fillInAllCartItemAttributes } from 'lib/cart-values';
import wp from 'lib/wp';

const wpcom = wp.undocumented();

let _cartKey = null;
let _synchronizer = null;
let _poller = null;

const CartStore = {
	get: function() {
		const value = hasLoadedFromServer() ? _synchronizer.getLatestValue() : {};

		return assign( {}, value, {
			hasLoadedFromServer: hasLoadedFromServer(),
			hasPendingServerUpdates: hasPendingServerUpdates(),
		} );
	},
	setSelectedSiteId( selectedSiteId ) {
		if ( selectedSiteId && _cartKey === selectedSiteId ) {
			return;
		}

		if ( ! selectedSiteId ) {
			_cartKey = 'no-site';
		} else {
			_cartKey = selectedSiteId;
		}

		if ( _synchronizer && _poller ) {
			PollerPool.remove( _poller );
			_synchronizer.off( 'change', emitChange );
		}

		_synchronizer = cartSynchronizer( _cartKey, wpcom );
		_synchronizer.on( 'change', emitChange );

		_poller = PollerPool.add( CartStore, _synchronizer._poll.bind( _synchronizer ) );
	},
};

emitter( CartStore );

function hasLoadedFromServer() {
	return _synchronizer && _synchronizer.hasLoadedFromServer();
}

function hasPendingServerUpdates() {
	return _synchronizer && _synchronizer.hasPendingServerUpdates();
}

function emitChange() {
	CartStore.emit( 'change' );
}

function update( changeFunction ) {
	const wrappedFunction = flowRight(
		partialRight( fillInAllCartItemAttributes, productsList.get() ),
		changeFunction
	);

	const previousCart = CartStore.get();
	const nextCart = wrappedFunction( previousCart );

	_synchronizer.update( wrappedFunction );
	recordEvents( previousCart, nextCart );
}

function disable() {
	if ( _synchronizer && _poller ) {
		PollerPool.remove( _poller );
		_synchronizer.off( 'change', emitChange );
	}

	_synchronizer = null;
	_poller = null;
	_cartKey = null;
}

CartStore.dispatchToken = Dispatcher.register( payload => {
	const { action } = payload;

	switch ( action.type ) {
		case UpgradesActionTypes.CART_DISABLE:
			disable();
			break;

		case UpgradesActionTypes.CART_PRIVACY_PROTECTION_ADD:
			update( cartItems.addPrivacyToAllDomains( CartStore.get() ) );
			break;

		case UpgradesActionTypes.CART_PRIVACY_PROTECTION_REMOVE:
			update( cartItems.removePrivacyFromAllDomains( CartStore.get() ) );
			break;

		case UpgradesActionTypes.GOOGLE_APPS_REGISTRATION_DATA_ADD:
			update(
				cartItems.fillGoogleAppsRegistrationData( CartStore.get(), action.registrationData )
			);
			break;

		case UpgradesActionTypes.CART_ITEMS_ADD:
			update( flow( ...action.cartItems.map( cartItem => cartItems.add( cartItem ) ) ) );
			break;

		case UpgradesActionTypes.CART_COUPON_APPLY:
			update( applyCoupon( action.coupon ) );
			break;

		case UpgradesActionTypes.CART_ITEM_REMOVE:
			update(
				cartItems.removeItemAndDependencies(
					action.cartItem,
					CartStore.get(),
					action.domainsWithPlansOnly
				)
			);
			break;
	}
} );

export default CartStore;
