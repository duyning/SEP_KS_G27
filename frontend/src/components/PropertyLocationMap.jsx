import OpenStreetPropertyMap from './OpenStreetPropertyMap.jsx';

// The shared canvas selects Google Maps when configured, with OSM fallback.
export default function PropertyLocationMap(props) {
  return <OpenStreetPropertyMap {...props}/>;
}
