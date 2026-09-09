import axios from 'axios';
import { httpsAgent } from './tls';

// Built once: a cli process is short-lived, and re-reading the config per request would
// re-read the CA bundle off disk on every call.
export default axios.create({ httpsAgent: httpsAgent() });
