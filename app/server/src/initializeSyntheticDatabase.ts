import { loadServerConfiguration } from './config.js';
import { initializeSyntheticDatabase } from './syntheticDatabase.js';

const configuration = loadServerConfiguration();
const result = initializeSyntheticDatabase(configuration.syntheticDatabase.filePath);
console.info(`Synthetic SQLite Work Order fixture initialized with ${result.workOrderCount} records at the deterministic ${result.referenceTime} reference time.`);
