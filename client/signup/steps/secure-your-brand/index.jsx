/**
 * External dependencies
 */

import { connect } from 'react-redux';
import PropTypes from 'prop-types';
import React, { Component } from 'react';
import { localize } from 'i18n-calypso';

/**
 * Internal dependencies
 */
import { isSubdomain } from 'lib/domains';
import { getSiteBySlug } from 'state/sites/selectors';
import StepWrapper from 'signup/step-wrapper';
import GutenboardingHeader from 'my-sites/plans-features-main/gutenboarding-header';
import { saveSignupStep, submitSignupStep } from 'state/signup/progress/actions';
import { recordTracksEvent } from 'state/analytics/actions';
import hasInitializedSites from 'state/selectors/has-initialized-sites';

/**
 * Style dependencies
 */
import './style.scss';

export class SecureYourBrandStep extends Component {
	componentDidMount() {
		this.props.saveSignupStep( { stepName: this.props.stepName } );
	}

	onSelectAdd = ( cartItem ) => {
		const { additionalStepData, stepSectionName, stepName, flowName } = this.props;

		this.props.recordTracksEvent( 'calypso_signup_brand_upsell' );

		const step = {
			stepName,
			stepSectionName,
			cartItem,
			...additionalStepData,
		};

		this.props.submitSignupStep( step, {
			cartItem,
		} );
		this.props.goToNextStep();
	};

	getDomainName() {
		return (
			this.props.signupDependencies.domainItem && this.props.signupDependencies.domainItem.meta
		);
	}

	handleFreePlanButtonClick = () => {
		this.onSelectAdd( null ); // onUpgradeClick expects a cart item -- null means Free Plan.
	};

	getGutenboardingHeader() {
		// launch flow coming from Gutenboarding
		if ( this.props.flowName === 'new-launch' ) {
			const { headerText, subHeaderText } = this.props;

			return (
				<GutenboardingHeader
					headerText={ headerText }
					subHeaderText={ subHeaderText }
					onFreePlanSelect={ this.handleFreePlanButtonClick }
				/>
			);
		}

		return null;
	}

	recommendedDomains() {
		return <div>Domains</div>;
	}

	render() {
		const {
			flowName,
			stepName,
			positionInFlow,
			translate,
			hasInitializedSitesBackUrl,
		} = this.props;

		return (
			<div className="secure-your-brand">
				<StepWrapper
					flowName={ flowName }
					stepName={ stepName }
					positionInFlow={ positionInFlow }
					headerText={ translate( 'Secure your name' ) }
					fallbackHeaderText={ translate( 'fallbackHeaderText' ) }
					subHeaderText={ translate(
						'Secure your name and save 20% with our Domain signup bundle'
					) }
					fallbackSubHeaderText={ translate( 'fallbackSubHeaderText' ) }
					isWideLayout={ true }
					stepContent={ this.recommendedDomains() }
					allowBackFirstStep={ !! hasInitializedSitesBackUrl }
					backUrl={ 'TBD' }
					backLabelText={ translate( 'Back' ) }
					hideFormattedHeader={ !! this.getGutenboardingHeader() }
				/>
			</div>
		);
	}
}

PlansStep.propTypes = {
	additionalStepData: PropTypes.object,
	disableBloggerPlanWithNonBlogDomain: PropTypes.bool,
	goToNextStep: PropTypes.func.isRequired,
	hideFreePlan: PropTypes.bool,
	selectedSite: PropTypes.object,
	stepName: PropTypes.string.isRequired,
	stepSectionName: PropTypes.string,
	customerType: PropTypes.string,
	translate: PropTypes.func.isRequired,
	planTypes: PropTypes.array,
	flowName: PropTypes.string,
};

export default connect(
	( state, { path, signupDependencies: { siteSlug, domainItem } } ) => ( {
		// Blogger plan is only available if user chose either a free domain or a .blog domain registration
		disableBloggerPlanWithNonBlogDomain:
			domainItem && ! isSubdomain( domainItem.meta ) && ! isDotBlogDomainRegistration( domainItem ),
		// This step could be used to set up an existing site, in which case
		// some descendants of this component may display discounted prices if
		// they apply to the given site.
		selectedSite: siteSlug ? getSiteBySlug( state, siteSlug ) : null,
		hasInitializedSitesBackUrl: hasInitializedSites( state ) ? '/sites/' : false,
	} ),
	{ recordTracksEvent, saveSignupStep, submitSignupStep }
)( localize( PlansStep ) );
