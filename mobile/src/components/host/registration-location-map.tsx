import { Text, View } from 'react-native';
import { h } from './host-ui';

export type RegistrationPoint = { latitude: number; longitude: number };
export type RegistrationMapProps = {
  point: RegistrationPoint | null;
  onSelect(point: RegistrationPoint): void;
};

export function RegistrationLocationMap(_props: RegistrationMapProps) {
  return <View style={h.card}><Text style={h.secondary}>Dán liên kết Google Maps có ghim hoặc nhập tọa độ để chọn vị trí trên web.</Text></View>;
}
