import { servicePriceText } from '../services/service-price.js';
export default function ServicePrice({ service }) {
 return <>{servicePriceText(service)}{service.priceUnit && service.price != null && service.pricingType !== 'NEGOTIABLE' && <small className="svc-price-unit"> / {service.priceUnit}</small>}</>;
}
