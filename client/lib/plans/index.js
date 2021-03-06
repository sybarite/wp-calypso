/** @format */

/**
 * External dependencies
 */

import moment from 'moment';
import { difference, find, get, includes, invoke, pick, values } from 'lodash';

/**
 * Internal dependencies
 */
import { isEnabled } from 'config';
import { isFreeJetpackPlan, isJetpackPlan, isMonthly } from 'lib/products-values';
import {
	FEATURES_LIST,
	PLANS_LIST,
	PLAN_FREE,
	PLAN_JETPACK_FREE,
	PLAN_PERSONAL,
} from 'lib/plans/constants';
import {
	TERM_MONTHLY,
	TERM_ANNUALLY,
	TERM_BIENNIALLY,
	TYPE_BUSINESS,
	TYPE_FREE,
	TYPE_PERSONAL,
	TYPE_PREMIUM,
} from './constants';

/**
 * Module vars
 */
const isPersonalPlanEnabled = isEnabled( 'plans/personal-plan' );

export function getPlans() {
	return PLANS_LIST;
}

export function getPlan( planKey ) {
	if ( Object.prototype.toString.apply( planKey ) === '[object Object]' ) {
		if ( values( PLANS_LIST ).indexOf( planKey ) !== -1 ) {
			return planKey;
		}
	}
	return PLANS_LIST[ planKey ];
}

export function getValidFeatureKeys() {
	return Object.keys( FEATURES_LIST );
}

export function isValidFeatureKey( feature ) {
	return !! FEATURES_LIST[ feature ];
}

export function getFeatureByKey( feature ) {
	return FEATURES_LIST[ feature ];
}

export function getFeatureTitle( feature ) {
	return invoke( FEATURES_LIST, [ feature, 'getTitle' ] );
}

export function canUpgradeToPlan( planKey, site ) {
	// Which "free plan" should we use to test
	const freePlan =
		get( site, 'jetpack', false ) && ! get( site, [ 'options', 'is_automated_transfer' ], false )
			? PLAN_JETPACK_FREE
			: PLAN_FREE;
	const plan = get( site, [ 'plan', 'expired' ], false )
		? freePlan
		: get( site, [ 'plan', 'product_slug' ], freePlan );
	return get( getPlan( planKey ), 'availableFor', () => false )( plan );
}

export function getUpgradePlanSlugFromPath( path, site ) {
	return find(
		Object.keys( PLANS_LIST ),
		planKey =>
			( planKey === path || getPlanPath( planKey ) === path ) && canUpgradeToPlan( planKey, site )
	);
}

export function getPlanPath( plan ) {
	return get( getPlan( plan ), 'getPathSlug', () => undefined )();
}

export function planHasFeature( plan, feature ) {
	return includes( get( getPlan( plan ), 'getFeatures', () => [] )(), feature );
}

export function getCurrentTrialPeriodInDays( plan ) {
	const { expiryMoment, subscribedDayMoment, userFacingExpiryMoment } = plan;

	if ( isInGracePeriod( plan ) ) {
		return expiryMoment.diff( userFacingExpiryMoment, 'days' );
	}

	return userFacingExpiryMoment.diff( subscribedDayMoment, 'days' );
}

export function getDayOfTrial( plan ) {
	const { subscribedDayMoment } = plan;

	// we return the difference plus one day so that the first day is day 1 instead of day 0
	return (
		moment()
			.startOf( 'day' )
			.diff( subscribedDayMoment, 'days' ) + 1
	);
}

export function getDaysUntilUserFacingExpiry( plan ) {
	const { userFacingExpiryMoment } = plan;

	return userFacingExpiryMoment.diff( moment().startOf( 'day' ), 'days' );
}

export function getDaysUntilExpiry( plan ) {
	const { expiryMoment } = plan;

	return expiryMoment.diff( moment().startOf( 'day' ), 'days' );
}

export function isInGracePeriod( plan ) {
	return getDaysUntilUserFacingExpiry( plan ) <= 0;
}

export function shouldFetchSitePlans( sitePlans, selectedSite ) {
	return ! sitePlans.hasLoadedFromServer && ! sitePlans.isRequesting && selectedSite;
}

export function filterPlansBySiteAndProps(
	plans,
	site,
	hideFreePlan,
	intervalType,
	showJetpackFreePlan
) {
	const hasPersonalPlan = site && site.plan.product_slug === PLAN_PERSONAL;

	return plans.filter( function( plan ) {
		if ( site && site.jetpack ) {
			if ( 'monthly' === intervalType ) {
				if ( showJetpackFreePlan ) {
					return isJetpackPlan( plan ) && isMonthly( plan );
				}
				return isJetpackPlan( plan ) && ! isFreeJetpackPlan( plan ) && isMonthly( plan );
			}

			if ( showJetpackFreePlan ) {
				return isJetpackPlan( plan ) && ! isMonthly( plan );
			}

			return isJetpackPlan( plan ) && ! isFreeJetpackPlan( plan ) && ! isMonthly( plan );
		}

		if ( hideFreePlan && PLAN_FREE === plan.product_slug ) {
			return false;
		}

		if ( plan.product_slug === PLAN_PERSONAL && ! ( hasPersonalPlan || isPersonalPlanEnabled ) ) {
			return false;
		}

		return ! isJetpackPlan( plan );
	} );
}

/**
 * Returns the monthly slug which corresponds to the provided yearly slug or "" if the slug is
 * not a recognized or cannot be converted.
 *
 * @param  {String} planSlug Slug to convert to monthly.
 * @return {String}          Monthly version slug or "" if the slug could not be converted.
 */
export function getMonthlyPlanByYearly( planSlug ) {
	return findFirstSimilarPlanKey( planSlug, { term: TERM_MONTHLY } ) || '';
}

/**
 * Returns the yearly slug which corresponds to the provided monthly slug or "" if the slug is
 * not a recognized or cannot be converted.
 *
 * @param  {String} planSlug Slug to convert to yearly.
 * @return {String}          Yearly version slug or "" if the slug could not be converted.
 */
export function getYearlyPlanByMonthly( planSlug ) {
	return findFirstSimilarPlanKey( planSlug, { term: TERM_ANNUALLY } ) || '';
}

/**
 * Returns true if plan "types" match regardless of their interval.
 *
 * For example (fake plans):
 *     planLevelsMatch( PRO_YEARLY, PRO_YEARLY ) => true
 *     planLevelsMatch( PRO_YEARLY, PRO_MONTHLY ) => true
 *     planLevelsMatch( PRO_YEARLY, PERSONAL_YEARLY ) => false
 *
 * @param  {String}  planSlugA One of the plan slugs to compare
 * @param  {String}  planSlugB One of the plan slugs to compare
 * @return {Boolean}           Whether the plan "types" match regardless of interval
 */
export function planLevelsMatch( planSlugA, planSlugB ) {
	const planA = getPlan( planSlugA );
	const planB = getPlan( planSlugB );
	return planA && planB && planA.type === planB.type && planA.group === planB.group;
}

export function isBusinessPlan( planSlug ) {
	return getPlan( planSlug ).type === TYPE_BUSINESS;
}

export function isPremiumPlan( planSlug ) {
	return getPlan( planSlug ).type === TYPE_PREMIUM;
}

export function isPersonalPlan( planSlug ) {
	return getPlan( planSlug ).type === TYPE_PERSONAL;
}

export function isFreePlan( planSlug ) {
	return getPlan( planSlug ).type === TYPE_FREE;
}

/**
 * @see findSimilarPlansKeys
 *
 * @param {string|object} planKey Source plan to compare to
 * @param {object} diff Properties that should differ in matched plan. @see planMatches
 * @return {string|undefined} Matched plan
 */
export function findFirstSimilarPlanKey( planKey, diff ) {
	return findSimilarPlansKeys( planKey, diff )[ 0 ];
}

/**
 * A similar plan is one that has the same `type`, `group`, and `term` as first
 * argument, except for differences specified in the second argument.
 *
 * For example:
 *
 * > findSimilarPlansKeys( TYPE_BUSINESS, { term: TERM_BIENNIALLY } );
 * [PLAN_BUSINESS_2_YEARS]
 * > findSimilarPlansKeys( TYPE_JETPACK_BUSINESS_MONTHLY, { type: TYPE_ANNUALLY } );
 * [TYPE_JETPACK_BUSINESS]
 *
 * @param {string|object} planKey Source plan to compare to
 * @param {object} diff Properties that should differ in matched plan. @see planMatches
 * @return {string[]} Matched plans keys
 */
export function findSimilarPlansKeys( planKey, diff = {} ) {
	const plan = getPlan( planKey );
	// @TODO: make getPlan() throw an error on failure. This is going to be a larger change with a separate PR.
	if ( ! plan ) {
		return [];
	}
	return findPlansKeys( {
		...pick( plan, 'type', 'group', 'term' ),
		...diff,
	} );
}

/**
 * Finds all keys of plans matching a query
 *
 * For example:
 *
 * > findPlansKeys( { term: TERM_BIENNIALLY } );
 * [PLAN_PERSONAL_2_YEARS, PLAN_PREMIUM_2_YEARS, PLAN_BUSINESS_2_YEARS]
 *
 * @param {object} query @see planMatches
 * @return {string[]} Matched plans keys
 */
export function findPlansKeys( query = {} ) {
	const plans = getPlans();
	return Object.keys( plans ).filter( k => planMatches( plans[ k ], query ) );
}

/**
 * Matches plan specified by `planKey` against `query`.
 * Only compares `type`, `group`, and `term` properties.
 *
 * For example:
 *
 * > planMatches( TYPE_BUSINESS, { term: TERM_ANNUALLY, group: GROUP_WPCOM, type: TYPE_BUSINESS } );
 * true
 *
 * > planMatches( TYPE_BUSINESS, { term: TERM_BIENNIALLY } );
 * false
 *
 * @param {string|object} planKey Plan to match
 * @param {object} query Properties that should match
 * @return {bool} Does `planKey` match?
 */
export function planMatches( planKey, query = {} ) {
	const acceptedKeys = [ 'type', 'group', 'term' ];
	const unknownKeys = difference( Object.keys( query ), acceptedKeys );
	if ( unknownKeys.length ) {
		throw new Error(
			`planMatches can only match against ${ acceptedKeys.join( ',' ) }, ` +
				`but unknown keys ${ unknownKeys.join( ',' ) } were passed.`
		);
	}

	// @TODO: make getPlan() throw an error on failure. This is going to be a larger change with a separate PR.
	const plan = getPlan( planKey ) || {};
	const match = key => ! ( key in query ) || plan[ key ] === query[ key ];
	return match( 'type' ) && match( 'group' ) && match( 'term' );
}

export function calculateMonthlyPriceForPlan( planSlug, termPrice ) {
	return calculateMonthlyPrice( getPlan( planSlug ).term, termPrice );
}

export function calculateMonthlyPrice( term, termPrice ) {
	let divisor;
	if ( term === TERM_MONTHLY ) {
		divisor = 1;
	} else if ( term === TERM_ANNUALLY ) {
		divisor = 12;
	} else if ( term === TERM_BIENNIALLY ) {
		divisor = 24;
	} else {
		throw new Error( `Unknown term: ${ term }` );
	}

	return parseFloat( ( termPrice / divisor ).toFixed( 2 ) );
}

export const isPlanFeaturesEnabled = () => {
	return isEnabled( 'manage/plan-features' );
};

export function plansLink( url, site, intervalType ) {
	if ( 'monthly' === intervalType ) {
		url += '/monthly';
	}

	if ( site && site.slug ) {
		url += '/' + site.slug;
	}

	return url;
}

export function applyTestFiltersToPlansList( planName, abtest ) {
	const filteredPlanConstantObj = { ...getPlan( planName ) };
	const filteredPlanFeaturesConstantList = getPlan( planName ).getFeatures( abtest );

	// these becomes no-ops when we removed some of the abtest overrides, but
	// we're leaving the code in place for future tests
	const removeDisabledFeatures = () => {};

	const updatePlanDescriptions = () => {};

	const updatePlanFeatures = () => {};

	removeDisabledFeatures();
	updatePlanDescriptions();
	updatePlanFeatures();

	filteredPlanConstantObj.getFeatures = () => filteredPlanFeaturesConstantList;

	return filteredPlanConstantObj;
}
