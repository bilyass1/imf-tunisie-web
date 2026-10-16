import type {PropertyFilters, PropertyListing} from './property-search';
export interface SearchResult {items:PropertyListing[];total:number;page:number;projects:Pick<PropertyListing,'project'|'projectName'|'city'>[];bedrooms:number[]}
export function search(pool:unknown,filters:PropertyFilters,locale:string,page?:number):Promise<SearchResult>;
