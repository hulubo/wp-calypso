/**
 * Returns store setup information
 *
 * @param  {object}  state  Global state tree
 * @param  {number}  siteId Site ID
 * @returns {object} Object with store setup information
 */
export default function getStoreSetup( state, siteId ) {
	// @todo this should return store setup information.
	const storeSetup = {
		timing: 1,
		remainingTasks: 3,
		totalTasks: 5,
	};
	return storeSetup;
}