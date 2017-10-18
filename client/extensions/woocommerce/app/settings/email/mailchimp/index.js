/**
 * External dependencies
 */
import { connect } from 'react-redux';
import { filter, matches } from 'lodash';
import { localize } from 'i18n-calypso';
import PropTypes from 'prop-types';
import React from 'react';

/**
 * Internal dependencies
 */
import { getPlugins } from 'state/plugins/installed/selectors';
import { getSelectedSiteId } from 'state/ui/selectors';
import { isRequestingForSites } from 'state/plugins/installed/selectors';
import { mailChimpSettings, isRequestingSettings } from 'woocommerce/state/sites/settings/email/selectors';
import MailChimpGettingStarted from './getting-started';
import MailChimpSetup from './setup-mailchimp';
import MailChimpDashboard from './mailchimp_dashboard';
import QueryJetpackPlugins from 'components/data/query-jetpack-plugins';
import QueryMailChimpSettings from 'woocommerce/state/sites/settings/email/querySettings';

class MailChimp extends React.Component {

	constructor( props ) {
		super( props );
		this.state = {
			setupWizardStarted: !! props.startWizard,
			wizardCompleted: false
		};
	}

	startWizard = () => {
		this.setState( { setupWizardStarted: true } );
	}

	closeWizard = ( status ) => {
		this.setState( { setupWizardStarted: false, wizardCompleted: 'wizard-completed' === status } );
	}

	closeSetupFinishNotice = () => {
		this.setState( { wizardCompleted: false } );
	}

	render() {
		const { hasMailChimp, isRequestingMailChimpSettings,
			isRequestingPlugins, siteId, site, settings, redirectToSettings } = this.props;
		const { setupWizardStarted } = this.state;
		const isRequestingData = ( isRequestingMailChimpSettings || isRequestingPlugins );
		const mailChimpIsReady = ! isRequestingData &&
			( settings && settings.active_tab === 'sync' );
		const gettingStarted = ! setupWizardStarted && ! isRequestingData &&
			( settings && settings.active_tab !== 'sync' );
		return (
			<div className="mailchimp">
				<QueryJetpackPlugins siteIds={ [ siteId ] } />
				<QueryMailChimpSettings siteId={ siteId } />
				{ ( isRequestingData || gettingStarted ) &&
					<MailChimpGettingStarted
						siteId={ siteId }
						site={ site }
						isPlaceholder={ isRequestingData }
						onClick={ this.startWizard }
						redirectToSettings={ redirectToSettings }
					/>
				}
				{ mailChimpIsReady &&
					<MailChimpDashboard
						siteId={ siteId }
						onClick={ this.startWizard }
						wizardCompleted={ this.state.wizardCompleted }
						onNoticeExit={ this.closeSetupFinishNotice } /> }
				{ setupWizardStarted &&
					<MailChimpSetup
							hasMailChimp={ hasMailChimp }
							settings={ settings }
							siteId={ siteId }
							onClose={ this.closeWizard }
						/>
				}
			</div>
		);
	}
}

MailChimp.propTypes = {
	siteId: PropTypes.number.isRequired,
	hasMailChimp: PropTypes.bool,
	isRequestingPlugins: PropTypes.bool,
	isRequestingMailChimpSettings: PropTypes.bool,
	settings: PropTypes.object,
	redirectToSettings: PropTypes.bool,
	startWizard: PropTypes.bool,
};

function mapStateToProps( state ) {
	const mailChimpId = 'mailchimp-for-woocommerce/mailchimp-woocommerce';
	const siteId = getSelectedSiteId( state );
	const isRequestingPlugins = isRequestingForSites( state, [ siteId ] );
	const isRequestingMailChimpSettings = isRequestingSettings( state, siteId );
	const sitePlugins = getPlugins( state, [ siteId ] );
	const mailChimp = filter( sitePlugins, matches( { id: mailChimpId } ) );
	const hasMailChimp = !! mailChimp.length;
	const settings = mailChimpSettings( state, siteId );
	return {
		siteId,
		hasMailChimp,
		isRequestingPlugins,
		isRequestingMailChimpSettings,
		settings: settings || {},
	};
}

export default connect( mapStateToProps )( localize( MailChimp ) );