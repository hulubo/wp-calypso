/**
 * External dependencies
 */
import React, { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import page from 'page';

/**
 * Internal dependencies
 */
import { useTranslate } from 'i18n-calypso';
import contactSupportUrl from 'lib/jetpack/contact-support-url';
import { useThreats } from 'lib/jetpack/use-threats';
import { recordTracksEvent } from 'state/analytics/actions';
import { getSelectedSite, getSelectedSiteId, getSelectedSiteSlug } from 'state/ui/selectors';
import isRequestingJetpackScanThreatCounts from 'state/selectors/is-requesting-jetpack-scan-threat-counts';
import isRequestingJetpackScanHistory from 'state/selectors/is-requesting-jetpack-scan-history';
import getScanSiteThreatCounts from 'state/selectors/get-site-scan-threat-counts';
import getScanSiteHistory from 'state/selectors/get-site-scan-history';
import QueryJetpackScanThreatCounts from 'components/data/query-jetpack-scan-threat-counts';
import QueryJetpackScanHistory from 'components/data/query-jetpack-scan-history';
import ThreatStatusFilter, { FilterValue, FilterOption } from './threat-status-filter';
import ThreatItem, { ThreatItemPlaceholder } from 'components/jetpack/threat-item';
import ThreatDialog from 'components/jetpack/threat-dialog';

const trackFilterChange = ( siteId: number, filter: string ) =>
	recordTracksEvent( 'calypso_jetpack_scan_history_filter', {
		site_id: siteId,
		filter,
	} );
const trackOpenThreatDialog = ( siteId: number, threatSignature: string ) =>
	recordTracksEvent( 'calypso_jetpack_scan_fixthreat_dialogopen', {
		site_id: siteId,
		threat_signature: threatSignature,
	} );

const getFilteredThreatCount = (
	threatCounts: { [ key: string ]: number },
	filter: FilterValue
) => {
	if ( ! threatCounts ) {
		return undefined;
	}

	if ( ! filter || filter === 'all' ) {
		return Object.values( threatCounts ).reduce( ( a, b ) => a + b, 0 );
	}

	return threatCounts[ filter ];
};

const ThreatItemsWrapper = ( { threats } ) => {
	const dispatch = useDispatch();
	const siteId = useSelector( getSelectedSiteId );
	const siteSlug = useSelector( getSelectedSiteSlug );
	const siteName = useSelector( ( state ) => getSelectedSite( state )?.name );
	const { selectedThreat, setSelectedThreat, updateThreat, updatingThreats } = useThreats( siteId );

	const [ showThreatDialog, setShowThreatDialog ] = React.useState( false );
	const openDialog = useCallback(
		( threat ) => {
			dispatch( trackOpenThreatDialog( siteId, threat.signature ) );
			setSelectedThreat( threat );
			setShowThreatDialog( true );
		},
		[ dispatch, setSelectedThreat, siteId ]
	);
	const closeDialog = useCallback( () => {
		setShowThreatDialog( false );
	}, [ setShowThreatDialog ] );
	const fixThreat = useCallback( () => {
		closeDialog();
		updateThreat( 'fix' );
	}, [ closeDialog, updateThreat ] );

	return (
		<>
			{ threats.map( ( threat ) => (
				<ThreatItem
					key={ threat.id }
					isPlaceholder={ false }
					threat={ threat }
					onFixThreat={ () => openDialog( threat ) }
					isFixing={ !! updatingThreats.find( ( threatId ) => threatId === threat.id ) }
					contactSupportUrl={ contactSupportUrl( siteSlug ) }
				/>
			) ) }
			{ selectedThreat && (
				<ThreatDialog
					showDialog={ showThreatDialog }
					onCloseDialog={ closeDialog }
					onConfirmation={ fixThreat }
					siteName={ siteName }
					threat={ selectedThreat }
					action={ 'fix' }
				/>
			) }
		</>
	);
};

const ThreatHistoryList = ( { filter }: ThreatHistoryListProps ) => {
	const translate = useTranslate();
	const dispatch = useDispatch();
	const siteId = useSelector( getSelectedSiteId ) as number;
	const siteSlug = useSelector( getSelectedSiteSlug );

	const isRequestingThreatCounts = useSelector( ( state ) =>
		isRequestingJetpackScanThreatCounts( state, siteId )
	);
	const threatCounts = useSelector( ( state ) => getScanSiteThreatCounts( state, siteId ) );
	const hasThreatsInHistory = threatCounts && Object.values( threatCounts ).some( ( c ) => c > 0 );
	const filteredThreatCount = getFilteredThreatCount( threatCounts, filter );

	const isRequestingThreatHistory = useSelector( ( state ) =>
		isRequestingJetpackScanHistory( state, siteId )
	);

	const threats = useSelector( ( state ) => getScanSiteHistory( state, siteId ) );
	const filteredThreats = useMemo( () => {
		if ( ! filter || filter === 'all' ) {
			return threats;
		}

		return threats.filter( ( entry ) => entry.status === filter );
	}, [ filter, threats ] );

	const onFilterChange = useCallback(
		( selected: FilterOption ) => {
			let filterPathParam: FilterValue | '' = selected.value;
			if ( filterPathParam === 'all' ) {
				filterPathParam = '';
			}

			dispatch( trackFilterChange( siteId, filterPathParam ) );
			page.show( `/scan/history/${ siteSlug }/${ filterPathParam }` );
		},
		[ dispatch, siteId, siteSlug ]
	);

	return (
		<div className="threat-history-list">
			<QueryJetpackScanThreatCounts siteId={ siteId } />
			<QueryJetpackScanHistory siteId={ siteId } />

			{ /* Loading threat counts should be pretty quick,
			     so no need to show any indicators while it's happening
			*/ }

			{ ! isRequestingThreatCounts && ! hasThreatsInHistory && (
				<p className="threat-history-list__no-entries">
					{ translate( 'So far, there are no archived threats on your site.' ) }
				</p>
			) }

			{
				// We can safely show the filter selector without having specific threat info
				! isRequestingThreatCounts && hasThreatsInHistory && (
					<div className="threat-history-list__filters-wrapper">
						<ThreatStatusFilter initialSelected={ filter } onSelect={ onFilterChange } />
					</div>
				)
			}

			{ ! isRequestingThreatCounts && filteredThreatCount > 0 && (
				<div className="threat-history-list__entries">
					{
						// Show placeholders if we're still getting threat info,
						// but 10 placeholders is probably the most we'd ever want to show
						isRequestingThreatHistory &&
							Array.from( Array( Math.min( filteredThreatCount, 10 ) ).keys() ).map( ( key ) => (
								<ThreatItemPlaceholder key={ key } />
							) )
					}
					{ ! isRequestingThreatHistory && <ThreatItemsWrapper threats={ filteredThreats } /> }
				</div>
			) }
		</div>
	);
};

type ThreatHistoryListProps = {
	filter: FilterValue;
};

export default ThreatHistoryList;
