import Keyv from 'keyv';
import { LRUCache } from 'typescript-lru-cache';

const cache = new LRUCache<string, string>();

const keyv = new Keyv({ store: cache });

// Export keyv để sử dụng làm cache
export default keyv;
