import CityLanding, { cityMetadata } from '@/components/site/CityLanding';
export const dynamic = 'force-dynamic';
export const generateMetadata = ({params}:{params:Promise<{locale:string}>}) => cityMetadata(params,'tunis');
export default function Page({params}:{params:Promise<{locale:string}>}) {
  return <CityLanding params={params} city="tunis"/>;
}
