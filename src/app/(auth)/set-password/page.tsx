import { SetPasswordForm } from '@/features/auth/components/set-password-form';

// Pantalla donde el invitado (o quien hizo recovery) define su contraseña.
// Requiere sesión activa (la crea /auth/confirm via verifyOtp). El middleware
// la protege: sin sesión redirige a /login.
export default function SetPasswordPage() {
  return <SetPasswordForm />;
}
