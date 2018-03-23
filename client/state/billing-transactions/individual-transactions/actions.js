/** @format */
/**
 * Internal dependencies
 */
import {
	BILLING_TRANSACTION_CLEAR_ERROR,
	BILLING_TRANSACTION_REQUEST,
	BILLING_TRANSACTION_RECEIVE,
	BILLING_TRANSACTION_REQUEST_FAILURE,
	BILLING_TRANSACTION_REQUEST_SUCCESS,
} from 'state/action-types';
import wp from 'lib/wp';

export const requestBillingTransaction = transactionId => dispatch => {
	dispatch( {
		type: BILLING_TRANSACTION_REQUEST,
		transactionId,
	} );

	return wp
		.undocumented()
		.me()
		.getReceipt( transactionId, { format: 'display' } )
		.then( receipt => {
			dispatch( {
				type: BILLING_TRANSACTION_REQUEST_SUCCESS,
				transactionId,
			} );
			dispatch( {
				type: BILLING_TRANSACTION_RECEIVE,
				transactionId,
				receipt,
			} );
		} )
		.catch( error => {
			dispatch( {
				type: BILLING_TRANSACTION_REQUEST_FAILURE,
				transactionId,
				error,
			} );
		} );
};

export const clearBillingTransactionError = transactionId => ( {
	type: BILLING_TRANSACTION_CLEAR_ERROR,
	transactionId,
} );
