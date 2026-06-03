import { redirect } from 'next/navigation';

// El Factory viejo (CRUD por-usuario) fue reemplazado por el nuevo Factory
// leader-only en /leader/proyectos (Sprint A). Redirigimos en vez de borrar
// la página para no perder el componente FactoryDashboard, que todavía guarda
// el wizard de creación + editar + eliminar pendientes de portar al nuevo.
export default function FactoryPage() {
  redirect('/leader/proyectos');
}
