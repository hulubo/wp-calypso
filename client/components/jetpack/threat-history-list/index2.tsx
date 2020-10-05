/**
 * External dependencies
 */
import React, { useCallback, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import page from 'page';

/**
 * Internal dependencies
 */
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
import ThreatItem from 'components/jetpack/threat-item';
import ThreatDialog from 'components/jetpack/threat-dialog';

const recordFilterChange = ( siteId: number, filter: string ) =>
	recordTracksEvent( 'calypso_jetpack_scan_history_filter', {
		site_id: siteId,
		filter,
	} );

const getFilteredThreatCount = ( threatCounts, filter ) => {
	if ( ! threatCounts ) {
		return undefined;
	}

	if ( ! filter || filter === 'all' ) {
		return Object.values( threatCounts ).reduce( ( a, b ) => a + b, 0 );
	}

	return threatCounts[ filter ];
};

const ThreatHistoryList = ( { filter }: ThreatHistoryListProps ) => {
	const dispatch = useDispatch();
	const siteId = useSelector( getSelectedSiteId ) as number;
	const siteSlug = useSelector( getSelectedSiteSlug );
	const siteName = useSelector( ( state ) => getSelectedSite( state )?.name );

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

			dispatch( recordFilterChange( siteId, filterPathParam ) );
			page.show( `/scan/history/${ siteSlug }/${ filterPathParam }` );
		},
		[ dispatch, siteId, siteSlug ]
	);

	const { selectedThreat, setSelectedThreat, updateThreat, updatingThreats } = useThreats( siteId );
	const [ showThreatDialog, setShowThreatDialog ] = React.useState( false );
	const openDialog = useCallback(
		( threat ) => {
			const eventName = 'calypso_jetpack_scan_fixthreat_dialogopen';
			dispatch(
				recordTracksEvent( eventName, {
					site_id: siteId,
					threat_signature: threat.signature,
				} )
			);
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
		<div className="threat-history-list">
			<QueryJetpackScanThreatCounts siteId={ siteId } />
			<QueryJetpackScanHistory siteId={ siteId } />

			{ /* Loading threat counts should be pretty quick,
			     so no need to show any indicators while it's happening
			*/ }

			{ ! isRequestingThreatCounts && ! hasThreatsInHistory && (
				<span>no threats ever and ever and ever!</span>
			) }

			{ ! isRequestingThreatCounts && hasThreatsInHistory && (
				<div className="threat-history-list__filters-wrapper">
					<ThreatStatusFilter initialSelected={ filter } onSelect={ onFilterChange } />
				</div>
			) }

			{ ! isRequestingThreatCounts && filteredThreatCount > 0 && (
				<div className="threat-history-list__entries">
					{ isRequestingThreatHistory &&
						Array.from( Array( filteredThreatCount ).keys() ).map( ( key ) => (
							<ThreatItem key={ key } isPlaceholder threat={ {} } isFixing={ false } />
						) ) }
					{ ! isRequestingThreatHistory && (
						<>
							{ filteredThreats.map( ( threat ) => (
								<ThreatItem
									key={ threat.id }
									threat={ threat }
									onFixThreat={ () => openDialog( threat ) }
									isFixing={ !! updatingThreats.find( ( threatId ) => threatId === threat.id ) }
									contactSupportUrl={ contactSupportUrl( siteSlug ) }
									isPlaceholder={ isRequestingThreatHistory }
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
					) }
				</div>
			) }
		</div>
	);
};

type ThreatHistoryListProps = {
	filter: FilterValue;
};

export default ThreatHistoryList;
