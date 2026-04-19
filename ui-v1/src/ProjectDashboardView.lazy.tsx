import { lazyRouteComponent } from '@tanstack/react-router';

export default lazyRouteComponent(() => import('./components/Project/ProjectDashboardView'));
