/** @format */

/**
 * External dependencies
 */
import React, { Component } from 'react';
import PropTypes from 'prop-types';
import { localize } from 'i18n-calypso';
import { connect } from 'react-redux';
import page from 'page';
import Gridicon from 'gridicons';

/**
 * Internal dependencies
 */
import config from 'config';
import HeaderCake from 'components/header-cake';
import Button from 'components/button';
import Card from 'components/card';
import GoogleMyBusinessConnectButton from 'my-sites/google-my-business/connect-button';
import { recordTracksEvent } from 'state/analytics/actions';

class SelectBusinessType extends Component {
	static propTypes = {
		recordTracksEvent: PropTypes.func.isRequired,
		siteId: PropTypes.string.isRequired,
		translate: PropTypes.func.isRequired,
	};

	trackCreateMyListingClick = () => {
		this.props.recordTracksEvent(
			'calypso_test_google_my_business_select_business_type_create_my_listing_button_click'
		);
	};

	trackOptimizeYourSEOClick = () => {
		this.props.recordTracksEvent(
			'calypso_test_google_my_business_select_business_type_optimize_your_seo_button_click'
		);
	};

	handleConnect = () => {
		/* eslint-disable no-console */
		console.log( 'connected' );
		// TODO: handle redirect to the "Create My Listings" page here
	};

	goBack = () => {
		page.back( `/stats/day/${ this.props.siteId }` );
	};

	render() {
		const { translate, siteId } = this.props;

		let connectButton;

		if ( config.isEnabled( 'google-my-business' ) ) {
			connectButton = (
				<GoogleMyBusinessConnectButton
					onClick={ this.trackCreateMyListingClick }
					onConnect={ this.handleConnect }
				>
					{ translate( 'Create My Listing', {
						comment: 'Call to Action to add a business listing to Google My Business',
					} ) }
				</GoogleMyBusinessConnectButton>
			);
		} else {
			connectButton = (
				<Button
					primary={ true }
					href="https://www.google.com/business/"
					target="_blank"
					onClick={ this.trackCreateMyListingClick }
				>
					{ translate( 'Create My Listing', {
						comment: 'Call to Action to add a business listing to Google My Business',
					} ) }
					<Gridicon icon="external" />
				</Button>
			);
		}

		return (
			<div className="select-business-type">
				<HeaderCake isCompact={ false } alwaysShowActionText={ false } onClick={ this.goBack }>
					{ translate( 'Google My Business' ) }
				</HeaderCake>

				<Card className="select-business-type__explanation">
					<div className="select-business-type__explanation-main">
						<h1>{ translate( 'Which type of business are you?' ) }</h1>

						<p>
							{ translate(
								'Google My Business lists your local business on Google Search and Google Maps. ' +
									'It works for businesses that have a physical location or serve a local area.'
							) }
						</p>
					</div>

					<img
						src="/calypso/images/google-my-business/business-local.svg"
						alt="Local business illustration"
					/>
				</Card>

				<Card className="select-business-type__cta-card">
					<div className="select-business-type__cta-card-main">
						<h2>
							{ translate( 'Physical Location or Service Area', {
								comment:
									'In the context of a business activity, brick and mortar or online service',
							} ) }
						</h2>
						<p>
							{ translate(
								'My business has a physical location customers can visit, ' +
									'or provides goods and services to local customers, or both.'
							) }
						</p>
					</div>
					<div className="select-business-type__cta-card-button-container">{ connectButton }</div>
				</Card>

				<Card className="select-business-type__cta-card">
					<div className="select-business-type__cta-card-main">
						<h2>
							{ translate( 'Online Only', {
								comment: 'In the context of a business activity, as opposed to a brick and mortar',
							} ) }
						</h2>
						<p>
							{ translate(
								"Don't provide in-person services? Learn more about reaching your customers online."
							) }
						</p>
					</div>
					<div className="select-business-type__cta-card-button-container">
						<Button
							href={ '/settings/traffic/' + siteId }
							onClick={ this.trackOptimizeYourSEOClick }
						>
							{ translate( 'Optimize Your SEO', { comment: 'Call to Action button' } ) }
							<Gridicon icon="external" />
						</Button>
					</div>
				</Card>
			</div>
		);
	}
}

export default connect( undefined, { recordTracksEvent } )( localize( SelectBusinessType ) );
