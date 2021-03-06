/**
 * External dependencies
 */
import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import { useMobileBreakpoint } from '@automattic/viewport-react';

/**
 * Internal dependencies
 */
import {
	durationToText,
	productBadgeLabelAlt,
	productButtonLabel,
	slugIsFeaturedProduct,
} from '../utils';
import PlanRenewalMessage from '../plan-renewal-message';
import RecordsDetailsAlt from '../records-details-alt';
import useItemPrice from '../use-item-price';
import { getSitePurchases } from 'calypso/state/purchases/selectors';
import getSitePlan from 'calypso/state/sites/selectors/get-site-plan';
import getSiteProducts from 'calypso/state/sites/selectors/get-site-products';
import { useLocalizedMoment } from 'calypso/components/localized-moment';
import JetpackProductCardAlt from 'calypso/components/jetpack/card/jetpack-product-card-alt';
import { planHasFeature } from 'calypso/lib/plans';
import { TERM_MONTHLY, TERM_ANNUALLY } from 'calypso/lib/plans/constants';
import { JETPACK_SEARCH_PRODUCTS } from 'calypso/lib/products-values/constants';
import { isCloseToExpiration } from 'calypso/lib/purchases';
import { getPurchaseByProductSlug } from 'calypso/lib/purchases/utils';

/**
 * Type dependencies
 */
import type { Duration, PurchaseCallback, SelectorProduct } from '../types';

interface ProductCardProps {
	item: SelectorProduct;
	onClick: PurchaseCallback;
	siteId: number | null;
	currencyCode: string | null;
	className?: string;
	highlight?: boolean;
	selectedTerm?: Duration;
}

const ProductCardAltWrapper = ( {
	item,
	onClick,
	siteId,
	currencyCode,
	className,
	highlight = false,
	selectedTerm,
}: ProductCardProps ) => {
	// Determine whether product is owned.
	const sitePlan = useSelector( ( state ) => getSitePlan( state, siteId ) );
	const siteProducts = useSelector( ( state ) => getSiteProducts( state, siteId ) );
	const isOwned = useMemo( () => {
		if ( sitePlan && sitePlan.product_slug === item.productSlug ) {
			return true;
		} else if ( siteProducts ) {
			return siteProducts
				.filter( ( product ) => ! product.expired )
				.map( ( product ) => product.productSlug )
				.includes( item.productSlug );
		}
		return false;
	}, [ item.productSlug, sitePlan, siteProducts ] );

	// Calculate the product price.
	const { originalPrice, discountedPrice } = useItemPrice(
		siteId,
		item,
		item?.monthlyProductSlug || ''
	);

	// Handles expiry.
	const moment = useLocalizedMoment();
	const purchases = useSelector( ( state ) => getSitePurchases( state, siteId ) );

	// If item is a plan feature, use the plan purchase object.
	const isItemPlanFeature = sitePlan && planHasFeature( sitePlan.product_slug, item.productSlug );
	const purchase = isItemPlanFeature
		? getPurchaseByProductSlug( purchases, sitePlan?.product_slug || '' )
		: getPurchaseByProductSlug( purchases, item.productSlug );

	const isExpiring = purchase && isCloseToExpiration( purchase );
	const showExpiryNotice = item.legacy && isExpiring;

	// Is highlighted?
	const isMobile: boolean = useMobileBreakpoint();
	const isHighlighted = highlight && ! isOwned && slugIsFeaturedProduct( item.productSlug );

	const isUpgradeableToYearly =
		isOwned && selectedTerm === TERM_ANNUALLY && item.term === TERM_MONTHLY;

	const description = showExpiryNotice && purchase ? <PlanRenewalMessage /> : item.description;
	const showRecordsDetails = JETPACK_SEARCH_PRODUCTS.includes( item.productSlug ) && siteId;

	return (
		<JetpackProductCardAlt
			headingLevel={ 3 }
			iconSlug={ item.iconSlug }
			productName={ item.displayName }
			subheadline={ item.tagline }
			description={ description }
			currencyCode={ currencyCode }
			billingTimeFrame={ durationToText( item.term ) }
			buttonLabel={ productButtonLabel( item, isOwned, isUpgradeableToYearly, sitePlan ) }
			buttonPrimary={ ! ( isOwned || isItemPlanFeature ) }
			badgeLabel={ productBadgeLabelAlt( item, isOwned, sitePlan ) }
			onButtonClick={ () => onClick( item, isUpgradeableToYearly, purchase ) }
			features={ item.features }
			searchRecordsDetails={
				showRecordsDetails && <RecordsDetailsAlt productSlug={ item.productSlug } />
			}
			originalPrice={ originalPrice }
			discountedPrice={ discountedPrice }
			withStartingPrice={
				// Search has several pricing tiers
				item.subtypes.length > 0 || JETPACK_SEARCH_PRODUCTS.includes( item.productSlug )
			}
			isOwned={ isOwned }
			isDeprecated={ item.legacy }
			className={ className }
			expiryDate={ showExpiryNotice && purchase ? moment( purchase.expiryDate ) : undefined }
			isHighlighted={ isHighlighted }
			isExpanded={ isHighlighted && ! isMobile }
			hidePrice={ false }
			productSlug={ item.productSlug }
		/>
	);
};

export default ProductCardAltWrapper;
