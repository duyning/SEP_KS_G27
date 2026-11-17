import { LoginView } from './login-view';
import { RegisterView } from './register-view';

interface AuthScreenProps {
  mode: 'login' | 'register';
}

export default function AuthScreen({ mode }: AuthScreenProps) {
  if (mode === 'register') {
    return <RegisterView />;
  }
  return <LoginView />;
}
