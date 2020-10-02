/**
 * Internal dependencies
 */
import { JETPACK_SCAN_THREAT_COUNTS_REQUEST } from 'state/action-types';

import 'state/data-layer/wpcom/sites/scan/threat-counts';

export const requestThreatCounts = ( siteId ) => ( {
	type: JETPACK_SCAN_THREAT_COUNTS_REQUEST,
	siteId,
} );
