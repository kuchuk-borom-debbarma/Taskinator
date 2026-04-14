import { AutomationServiceImpl } from './internal/AutomationServiceImpl.ts';

export const automationService = new AutomationServiceImpl();
export * from './AutomationService.ts';
