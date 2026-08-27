import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AppLayout } from './layout/AppLayout';
import { AuthGuard } from './layout/AuthGuard';
import { RequireRole } from './layout/RequireRole';
import { ROLES, type Role } from './lib/roles';

const WORKPLACE_MANAGER_ROLES: Role[] = ['Admin'];
const TEMPLATE_MANAGER_ROLES: Role[] = ROLES.filter((r) => r !== 'Worker');
import { LoginPage } from './pages/LoginPage';
import { RegisterPage } from './pages/RegisterPage';
import { DashboardPage } from './pages/DashboardPage';
import { MyActionsPage } from './pages/MyActionsPage';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { HazardListPage } from './pages/HazardListPage';
import { NewHazardPage } from './pages/NewHazardPage';
import { HazardDetailPage } from './pages/HazardDetailPage';
import { FindingListPage } from './pages/FindingListPage';
import { NewFindingPage } from './pages/NewFindingPage';
import { FindingDetailPage } from './pages/FindingDetailPage';
import { InspectionListPage } from './pages/InspectionListPage';
import { NewInspectionPage } from './pages/NewInspectionPage';
import { InspectionConductPage } from './pages/InspectionConductPage';
import { InspectionReviewPage } from './pages/InspectionReviewPage';
import { InspectionDetailPage } from './pages/InspectionDetailPage';
import { InspectionTemplateListPage } from './pages/InspectionTemplateListPage';
import { NewInspectionTemplatePage } from './pages/NewInspectionTemplatePage';
import { InspectionTemplateDetailPage } from './pages/InspectionTemplateDetailPage';
import { EditInspectionTemplatePage } from './pages/EditInspectionTemplatePage';
import { CorrectiveActionListPage } from './pages/CorrectiveActionListPage';
import { NewCorrectiveActionPage } from './pages/NewCorrectiveActionPage';
import { CorrectiveActionDetailPage } from './pages/CorrectiveActionDetailPage';
import { WorkplaceListPage } from './pages/WorkplaceListPage';
import { NewWorkplacePage } from './pages/NewWorkplacePage';
import { WorkplaceDetailPage } from './pages/WorkplaceDetailPage';
import { EditWorkplacePage } from './pages/EditWorkplacePage';
import { RiskAssessmentListPage } from './pages/RiskAssessmentListPage';
import { NewRiskAssessmentPage } from './pages/NewRiskAssessmentPage';
import { RiskAssessmentDetailPage } from './pages/RiskAssessmentDetailPage';
import { EditRiskAssessmentPage } from './pages/EditRiskAssessmentPage';
import { ReportsPage } from './pages/ReportsPage';
import { SettingsPage } from './pages/SettingsPage';
import { navItems } from './lib/nav';

const placeholderNavItems = navItems.filter(
  (item) =>
    item.path !== '/dashboard' &&
    item.path !== '/my-actions' &&
    item.path !== '/hazards' &&
    item.path !== '/findings' &&
    item.path !== '/inspections' &&
    item.path !== '/corrective-actions' &&
    item.path !== '/workplaces' &&
    item.path !== '/risk-assessments' &&
    item.path !== '/reports' &&
    item.path !== '/settings',
);

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route element={<AuthGuard />}>
        <Route element={<AppLayout />}>
          <Route index element={<Navigate to="/dashboard" replace />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/my-actions" element={<MyActionsPage />} />

          <Route path="/hazards" element={<HazardListPage />} />
          <Route path="/hazards/new" element={<NewHazardPage />} />
          <Route path="/hazards/:id" element={<HazardDetailPage />} />

          <Route path="/findings" element={<FindingListPage />} />
          <Route path="/findings/new" element={<NewFindingPage />} />
          <Route path="/findings/:id" element={<FindingDetailPage />} />

          <Route path="/inspections" element={<InspectionListPage />} />
          <Route path="/inspections/new" element={<NewInspectionPage />} />
          <Route path="/inspections/:id/conduct" element={<InspectionConductPage />} />
          <Route path="/inspections/:id/review" element={<InspectionReviewPage />} />
          <Route path="/inspections/:id" element={<InspectionDetailPage />} />

          <Route path="/inspection-templates" element={<InspectionTemplateListPage />} />
          <Route
            path="/inspection-templates/new"
            element={
              <RequireRole roles={TEMPLATE_MANAGER_ROLES}>
                <NewInspectionTemplatePage />
              </RequireRole>
            }
          />
          <Route
            path="/inspection-templates/:id/edit"
            element={
              <RequireRole roles={TEMPLATE_MANAGER_ROLES}>
                <EditInspectionTemplatePage />
              </RequireRole>
            }
          />
          <Route path="/inspection-templates/:id" element={<InspectionTemplateDetailPage />} />

          <Route path="/corrective-actions" element={<CorrectiveActionListPage />} />
          <Route path="/corrective-actions/new" element={<NewCorrectiveActionPage />} />
          <Route path="/corrective-actions/:id" element={<CorrectiveActionDetailPage />} />

          <Route path="/workplaces" element={<WorkplaceListPage />} />
          <Route
            path="/workplaces/new"
            element={
              <RequireRole roles={WORKPLACE_MANAGER_ROLES}>
                <NewWorkplacePage />
              </RequireRole>
            }
          />
          <Route
            path="/workplaces/:id/edit"
            element={
              <RequireRole roles={WORKPLACE_MANAGER_ROLES}>
                <EditWorkplacePage />
              </RequireRole>
            }
          />
          <Route path="/workplaces/:id" element={<WorkplaceDetailPage />} />

          <Route path="/risk-assessments" element={<RiskAssessmentListPage />} />
          <Route path="/risk-assessments/new" element={<NewRiskAssessmentPage />} />
          <Route path="/risk-assessments/:id/edit" element={<EditRiskAssessmentPage />} />
          <Route path="/risk-assessments/:id" element={<RiskAssessmentDetailPage />} />

          <Route path="/reports" element={<ReportsPage />} />

          <Route path="/settings" element={<SettingsPage />} />

          {placeholderNavItems.map((item) => (
            <Route
              key={item.path}
              path={item.path}
              element={<PlaceholderPage title={item.label} icon={item.icon} />}
            />
          ))}
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default App;
