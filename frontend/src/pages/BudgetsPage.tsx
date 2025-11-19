import { useState } from 'react';
import { useProjects } from '@/hooks/useProjects';
import { useProjectBudgets, type ProjectBudget } from '@/hooks/useProjectBudgets';
import { useTimeEntries } from '@/hooks/useTimeEntries';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { AlertCircle, DollarSign, Plus, TrendingUp, Edit2, Trash2 } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Skeleton } from '@/components/ui/skeleton';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';

const CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD'];
const PERIODS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'total', label: 'Total Project' },
];

export default function BudgetsPage() {
  const { projects, isLoading: projectsLoading } = useProjects();
  const { budgets, isLoading: budgetsLoading, createBudget, updateBudget, deleteBudget } = useProjectBudgets();
  const { entries } = useTimeEntries();

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [editingBudget, setEditingBudget] = useState<ProjectBudget | null>(null);
  const [deletingBudgetId, setDeletingBudgetId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    project_id: '',
    amount: '',
    currency: 'USD',
    period: 'monthly',
    alert_threshold: '80',
  });

  const handleSubmit = () => {
    if (!formData.project_id || !formData.amount) return;

    const budgetData = {
      project_id: parseInt(formData.project_id),
      amount: parseFloat(formData.amount),
      currency: formData.currency,
      period: formData.period as 'monthly' | 'quarterly' | 'yearly' | 'total',
      alert_threshold: parseFloat(formData.alert_threshold),
    };

    if (editingBudget) {
      updateBudget({ id: editingBudget.id, updates: budgetData });
      setEditingBudget(null);
    } else {
      createBudget(budgetData);
    }

    setIsCreateOpen(false);
    resetForm();
  };

  const resetForm = () => {
    setFormData({
      project_id: '',
      amount: '',
      currency: 'USD',
      period: 'monthly',
      alert_threshold: '80',
    });
  };

  const openEditDialog = (budget: ProjectBudget) => {
    setEditingBudget(budget);
    setFormData({
      project_id: budget.project_id,
      amount: budget.amount.toString(),
      currency: budget.currency,
      period: budget.period,
      alert_threshold: budget.alert_threshold.toString(),
    });
    setIsCreateOpen(true);
  };

  const calculateSpent = (projectId: string, budget: ProjectBudget): number => {
    const projectEntries = entries.filter(e => e.projectId === projectId && e.duration > 0);
    
    // Calculate total hours
    const totalHours = projectEntries.reduce((sum, entry) => {
      return sum + entry.duration / 60; // duration is in minutes
    }, 0);

    // Get project hourly rate or use default
    const project = projects.find(p => p.id === projectId);
    const hourlyRate = project?.hourlyRate || 75; // $75/hour default
    return totalHours * hourlyRate;
  };

  const getProgressColor = (percentage: number, threshold: number): string => {
    if (percentage >= 100) return 'bg-red-500';
    if (percentage >= threshold) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getBudgetStatus = (percentage: number, threshold: number): { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' } => {
    if (percentage >= 100) return { label: 'Over Budget', variant: 'destructive' };
    if (percentage >= threshold) return { label: 'Warning', variant: 'secondary' };
    return { label: 'On Track', variant: 'default' };
  };

  if (projectsLoading || budgetsLoading) {
    return (
      <div className="p-8">
        <div className="mb-6">
          <Skeleton className="h-8 w-64 mb-2" />
          <Skeleton className="h-4 w-96" />
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {[1, 2, 3].map(i => (
            <Skeleton key={i} className="h-64" />
          ))}
        </div>
      </div>
    );
  }

  const budgetsWithProjects = budgets.map(budget => {
    const project = projects.find(p => p.id === budget.project_id);
    const spent = calculateSpent(String(budget.project_id), budget);
    const budgetAmount = typeof budget.amount === 'string' ? parseFloat(budget.amount) : budget.amount;
    const percentage = budgetAmount > 0 ? (spent / budgetAmount) * 100 : 0;
    const alertThreshold = typeof budget.alert_threshold === 'string' ? parseFloat(budget.alert_threshold) : budget.alert_threshold;
    const status = getBudgetStatus(percentage, alertThreshold);

    return { budget, project, spent, percentage, status, budgetAmount, alertThreshold };
  });

  return (
    <div className="p-8">
      <div className="flex justify-between items-start mb-6">
        <div>
          <h1 className="text-3xl font-bold mb-2">Budget Tracking</h1>
          <p className="text-muted-foreground">
            Monitor project budgets and get alerts when approaching limits
          </p>
        </div>
        <Dialog open={isCreateOpen} onOpenChange={(open) => {
          setIsCreateOpen(open);
          if (!open) {
            setEditingBudget(null);
            resetForm();
          }
        }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="w-4 h-4 mr-2" />
              Set Budget
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingBudget ? 'Edit Budget' : 'Set Project Budget'}</DialogTitle>
              <DialogDescription>
                Set a budget limit for a project and get alerts when approaching the threshold
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="project">Project</Label>
                <Select
                  value={formData.project_id}
                  onValueChange={(value) => setFormData({ ...formData, project_id: value })}
                >
                  <SelectTrigger id="project">
                    <SelectValue placeholder="Select project" />
                  </SelectTrigger>
                  <SelectContent>
                    {projects.map(project => (
                      <SelectItem key={project.id} value={project.id}>
                        {project.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="amount">Budget Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="10000"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="currency">Currency</Label>
                  <Select
                    value={formData.currency}
                    onValueChange={(value) => setFormData({ ...formData, currency: value })}
                  >
                    <SelectTrigger id="currency">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {CURRENCIES.map(currency => (
                        <SelectItem key={currency} value={currency}>
                          {currency}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="period">Budget Period</Label>
                <Select
                  value={formData.period}
                  onValueChange={(value) => setFormData({ ...formData, period: value })}
                >
                  <SelectTrigger id="period">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PERIODS.map(period => (
                      <SelectItem key={period.value} value={period.value}>
                        {period.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="threshold">Alert Threshold (%)</Label>
                <Input
                  id="threshold"
                  type="number"
                  min="0"
                  max="100"
                  placeholder="80"
                  value={formData.alert_threshold}
                  onChange={(e) => setFormData({ ...formData, alert_threshold: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  Get alerts when spending reaches this percentage of the budget
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsCreateOpen(false);
                setEditingBudget(null);
                resetForm();
              }}>
                Cancel
              </Button>
              <Button onClick={handleSubmit}>
                {editingBudget ? 'Update Budget' : 'Create Budget'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {budgetsWithProjects.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16">
            <DollarSign className="w-16 h-16 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No budgets set</h3>
            <p className="text-muted-foreground text-center mb-4">
              Set budgets for your projects to track spending and get alerts
            </p>
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              Set Your First Budget
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {budgetsWithProjects.map(({ budget, project, spent, percentage, status, budgetAmount, alertThreshold }) => (
            <Card key={budget.id} className={percentage >= alertThreshold ? 'border-yellow-500' : ''}>
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-lg">{project?.name || 'Unknown Project'}</CardTitle>
                    <CardDescription className="capitalize">{budget.period} Budget</CardDescription>
                  </div>
                  <div className="flex gap-1">
                    <Button variant="ghost" size="icon" onClick={() => openEditDialog(budget)}>
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => setDeletingBudgetId(budget.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-2xl font-bold">
                      {budget.currency} {spent.toFixed(2)}
                    </span>
                    <Badge variant={status.variant}>
                      {status.label}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    of {budget.currency} {budgetAmount.toFixed(2)} budget
                  </p>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Progress</span>
                    <span className="font-medium">{percentage.toFixed(1)}%</span>
                  </div>
                  <Progress 
                    value={Math.min(percentage, 100)} 
                    className={`h-2 ${getProgressColor(percentage, alertThreshold)}`}
                  />
                </div>

                {percentage >= alertThreshold && (
                  <Alert>
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>
                      {percentage >= 100 
                        ? 'Budget exceeded! Review spending immediately.'
                        : `${alertThreshold}% threshold reached. Monitor spending closely.`
                      }
                    </AlertDescription>
                  </Alert>
                )}

                <div className="flex items-center gap-2 text-sm text-muted-foreground pt-2 border-t">
                  <TrendingUp className="w-4 h-4" />
                  <span>Alert at {alertThreshold}%</span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <AlertDialog open={!!deletingBudgetId} onOpenChange={() => setDeletingBudgetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Budget</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this budget? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deletingBudgetId) {
                  deleteBudget(deletingBudgetId);
                  setDeletingBudgetId(null);
                }
              }}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
