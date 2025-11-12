import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { FileText, Plus, Download, Eye, DollarSign, Calendar, Repeat, Edit2, Trash2, Pause, Play } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDurationShort } from "@/lib/utils-time";
import { useClients } from "@/hooks/useClients";
import { useInvoices, type Invoice } from "@/hooks/useInvoices";
import { useProjects } from "@/hooks/useProjects";
import { useRecurringInvoices, type RecurringInvoice } from "@/hooks/useRecurringInvoices";
import { format, addDays, addWeeks, addMonths, addQuarters, addYears } from "date-fns";

interface InvoiceItem {
  description: string;
  hours: number;
  rate: number;
  amount: number;
}

export default function InvoicesPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);
  
  // Recurring invoices state
  const { clients } = useClients();
  const { projects } = useProjects();
  const { invoices, isLoading: invoicesLoading, createInvoice, updateInvoice, deleteInvoice } = useInvoices();
  const { 
    recurringInvoices, 
    isLoading: recurringLoading,
    createRecurringInvoice, 
    updateRecurringInvoice, 
    deleteRecurringInvoice,
    toggleRecurringInvoice
  } = useRecurringInvoices();
  
  const [isRecurringDialogOpen, setIsRecurringDialogOpen] = useState(false);
  const [editingRecurring, setEditingRecurring] = useState<RecurringInvoice | null>(null);
  const [deletingRecurringId, setDeletingRecurringId] = useState<string | null>(null);
  
  const [recurringFormData, setRecurringFormData] = useState({
    client_id: '',
    amount: '',
    currency: 'USD',
    frequency: 'monthly' as 'weekly' | 'monthly' | 'quarterly' | 'yearly',
    next_run_date: new Date().toISOString().split('T')[0],
    description: '',
    is_active: true,
  });
  
  const handleRecurringSubmit = () => {
    if (!recurringFormData.client_id || !recurringFormData.amount) return;

    const data = {
      client_id: recurringFormData.client_id,
      amount: parseFloat(recurringFormData.amount),
      currency: recurringFormData.currency,
      frequency: recurringFormData.frequency,
      next_run_date: recurringFormData.next_run_date,
      description: recurringFormData.description,
      is_active: recurringFormData.is_active,
    };

    if (editingRecurring) {
      updateRecurringInvoice({ id: editingRecurring.id, updates: data });
    } else {
      createRecurringInvoice(data);
    }

    setIsRecurringDialogOpen(false);
    resetRecurringForm();
  };

  const resetRecurringForm = () => {
    setRecurringFormData({
      client_id: '',
      amount: '',
      currency: 'USD',
      frequency: 'monthly',
      next_run_date: new Date().toISOString().split('T')[0],
      description: '',
      is_active: true,
    });
    setEditingRecurring(null);
  };

  const openEditRecurring = (recurring: RecurringInvoice) => {
    setEditingRecurring(recurring);
    setRecurringFormData({
      client_id: recurring.client_id,
      amount: recurring.amount.toString(),
      currency: recurring.currency,
      frequency: recurring.frequency,
      next_run_date: recurring.next_run_date,
      description: recurring.description || '',
      is_active: recurring.is_active,
    });
    setIsRecurringDialogOpen(true);
  };

  const getFrequencyLabel = (frequency: string) => {
    return frequency.charAt(0).toUpperCase() + frequency.slice(1);
  };

  const getNextRunDateLabel = (date: string, frequency: string) => {
    const nextDate = new Date(date);
    return format(nextDate, 'MMM d, yyyy');
  };

  const generatePDF = (invoice: Invoice) => {
    const doc = new jsPDF();
    
    // Get client name
    const client = clients.find(c => c.id === invoice.client_id);
    const clientName = client?.name || 'Unknown Client';

    // Header
    doc.setFontSize(24);
    doc.text("INVOICE", 20, 20);

    doc.setFontSize(10);
    doc.text(`Invoice #: ${invoice.invoice_number}`, 20, 30);
    doc.text(`Issue Date: ${new Date(invoice.issue_date).toLocaleDateString()}`, 20, 35);
    doc.text(`Due Date: ${new Date(invoice.due_date).toLocaleDateString()}`, 20, 40);
    doc.text(`Status: ${invoice.status.toUpperCase()}`, 20, 45);

    // Client Info
    doc.setFontSize(12);
    doc.text("Bill To:", 20, 60);
    doc.setFontSize(10);
    doc.text(clientName, 20, 65);
    if (client?.email) {
      doc.text(client.email, 20, 70);
    }

    // Company Info (right side)
    doc.setFontSize(10);
    doc.text("Your Company Name", 140, 60);
    doc.text("Your Address", 140, 65);
    doc.text("City, State ZIP", 140, 70);
    doc.text("your@email.com", 140, 75);

    // Summary Table
    autoTable(doc, {
      startY: 90,
      head: [["Description", "Amount"]],
      body: [
        ["Service/Work", `$${invoice.subtotal.toFixed(2)}`],
      ],
      foot: [
        ["Subtotal:", `$${invoice.subtotal.toFixed(2)}`],
        [`Tax (${(invoice.tax_rate * 100).toFixed(0)}%):`, `$${invoice.tax_amount.toFixed(2)}`],
        ["Total:", `$${invoice.total.toFixed(2)}`],
      ],
      theme: "striped",
      headStyles: { fillColor: [0, 0, 0] },
      footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: "bold" },
    });

    // Notes
    const finalY = (doc as any).lastAutoTable.finalY || 150;
    if (invoice.notes) {
      doc.setFontSize(10);
      doc.text("Notes:", 20, finalY + 15);
      doc.setFontSize(9);
      const notes = doc.splitTextToSize(invoice.notes, 170);
      doc.text(notes, 20, finalY + 22);
    }

    // Payment Terms
    doc.setFontSize(10);
    doc.text("Thank you for your business!", 20, finalY + (invoice.notes ? 40 : 25));

    // Save PDF
    doc.save(`${invoice.invoice_number}.pdf`);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "paid":
        return "bg-green-500/10 text-green-500 border-green-500/20";
      case "sent":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      case "overdue":
        return "bg-red-500/10 text-red-500 border-red-500/20";
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  return (
    <div className="container mx-auto px-8 py-8">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Invoices</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Manage one-time and recurring invoices
          </p>
        </div>
      </div>

      <Tabs defaultValue="invoices" className="space-y-6">
        <TabsList>
          <TabsTrigger value="invoices">
            <FileText className="h-4 w-4 mr-2" />
            Invoices
          </TabsTrigger>
          <TabsTrigger value="recurring">
            <Repeat className="h-4 w-4 mr-2" />
            Recurring
          </TabsTrigger>
        </TabsList>

        <TabsContent value="invoices" className="space-y-6">
          <div className="flex justify-end">
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Invoice
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Create New Invoice</DialogTitle>
                  <DialogDescription>Generate an invoice for your client</DialogDescription>
                </DialogHeader>
                <div className="grid gap-4 py-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Client</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select client" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Acme Corp</SelectItem>
                          <SelectItem value="2">Tech Startup</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label>Project</Label>
                      <Select>
                        <SelectTrigger>
                          <SelectValue placeholder="Select project" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="1">Website Redesign</SelectItem>
                          <SelectItem value="2">Mobile App</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Issue Date</Label>
                      <Input type="date" defaultValue={new Date().toISOString().split("T")[0]} />
                    </div>
                    <div className="space-y-2">
                      <Label>Due Date</Label>
                      <Input type="date" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Tax Rate (%)</Label>
                    <Input type="number" placeholder="0" step="0.1" />
                  </div>
                  <div className="space-y-2">
                    <Label>Notes</Label>
                    <Textarea placeholder="Payment terms, special instructions, etc." rows={3} />
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsCreateOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit">Create Invoice</Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Revenue</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ${invoices.reduce((sum, inv) => sum + inv.total, 0).toLocaleString()}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Paid</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {invoices.filter((inv) => inv.status === "paid").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {invoices.filter((inv) => inv.status === "sent").length}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Overdue</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-500">
              {invoices.filter((inv) => inv.status === "overdue").length}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Invoices List */}
      <Card>
        <CardHeader>
          <CardTitle>All Invoices</CardTitle>
          <CardDescription>Manage and track your invoices</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {invoices.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                No invoices yet. Create your first invoice to get started.
              </div>
            ) : (
              invoices.map((invoice) => {
                const client = clients.find(c => c.id === invoice.client_id);
                const clientName = client?.name || 'Unknown Client';
                
                return (
              <div
                key={invoice.id}
                className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4 flex-1">
                  <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
                    <FileText className="h-5 w-5 text-primary" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <div className="font-semibold">{invoice.invoice_number}</div>
                      <Badge variant="outline" className={getStatusColor(invoice.status)}>
                        {invoice.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {clientName}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="font-semibold">${invoice.total.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">
                      Due {new Date(invoice.due_date).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setSelectedInvoice(invoice)}
                    >
                      <Eye className="h-4 w-4 mr-1" />
                      View
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => generatePDF(invoice)}
                    >
                      <Download className="h-4 w-4 mr-1" />
                      PDF
                    </Button>
                  </div>
                </div>
              </div>
            );
            }))}
          </div>
        </CardContent>
      </Card>
        </TabsContent>

        <TabsContent value="recurring" className="space-y-6">
          <div className="flex justify-end">
            <Dialog open={isRecurringDialogOpen} onOpenChange={(open) => {
              setIsRecurringDialogOpen(open);
              if (!open) resetRecurringForm();
            }}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Recurring Invoice
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>{editingRecurring ? 'Edit' : 'Create'} Recurring Invoice</DialogTitle>
                  <DialogDescription>
                    Set up automatic invoice generation
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="client">Client *</Label>
                    <Select
                      value={recurringFormData.client_id}
                      onValueChange={(value) => setRecurringFormData({ ...recurringFormData, client_id: value })}
                    >
                      <SelectTrigger id="client">
                        <SelectValue placeholder="Select client" />
                      </SelectTrigger>
                      <SelectContent>
                        {clients.map(client => (
                          <SelectItem key={client.id} value={client.id}>
                            {client.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="amount">Amount *</Label>
                      <Input
                        id="amount"
                        type="number"
                        step="0.01"
                        placeholder="0.00"
                        value={recurringFormData.amount}
                        onChange={(e) => setRecurringFormData({ ...recurringFormData, amount: e.target.value })}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="currency">Currency</Label>
                      <Select
                        value={recurringFormData.currency}
                        onValueChange={(value) => setRecurringFormData({ ...recurringFormData, currency: value })}
                      >
                        <SelectTrigger id="currency">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD'].map(curr => (
                            <SelectItem key={curr} value={curr}>{curr}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="frequency">Frequency</Label>
                    <Select
                      value={recurringFormData.frequency}
                      onValueChange={(value: any) => setRecurringFormData({ ...recurringFormData, frequency: value })}
                    >
                      <SelectTrigger id="frequency">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="weekly">Weekly</SelectItem>
                        <SelectItem value="monthly">Monthly</SelectItem>
                        <SelectItem value="quarterly">Quarterly</SelectItem>
                        <SelectItem value="yearly">Yearly</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="next_run">Next Invoice Date</Label>
                    <Input
                      id="next_run"
                      type="date"
                      value={recurringFormData.next_run_date}
                      onChange={(e) => setRecurringFormData({ ...recurringFormData, next_run_date: e.target.value })}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="description">Description</Label>
                    <Textarea
                      id="description"
                      placeholder="Service description..."
                      rows={3}
                      value={recurringFormData.description}
                      onChange={(e) => setRecurringFormData({ ...recurringFormData, description: e.target.value })}
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <Switch
                      id="active"
                      checked={recurringFormData.is_active}
                      onCheckedChange={(checked) => setRecurringFormData({ ...recurringFormData, is_active: checked })}
                    />
                    <Label htmlFor="active" className="cursor-pointer">
                      Active (invoices will be generated automatically)
                    </Label>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => {
                    setIsRecurringDialogOpen(false);
                    resetRecurringForm();
                  }}>
                    Cancel
                  </Button>
                  <Button onClick={handleRecurringSubmit}>
                    {editingRecurring ? 'Update' : 'Create'} Recurring Invoice
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recurring Invoices</CardTitle>
              <CardDescription>
                Automated invoice generation for regular clients
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {recurringLoading ? (
                  <div className="text-center py-8 text-muted-foreground">Loading...</div>
                ) : recurringInvoices.length === 0 ? (
                  <div className="text-center py-12 text-muted-foreground">
                    No recurring invoices set up yet.
                  </div>
                ) : (
                  recurringInvoices.map(recurring => {
                    const client = clients.find(c => c.id === recurring.client_id);
                    return (
                      <div
                        key={recurring.id}
                        className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-4 flex-1">
                          <div className={`h-10 w-10 rounded-lg flex items-center justify-center ${recurring.is_active ? 'bg-green-500/10' : 'bg-gray-500/10'}`}>
                            <Repeat className={`h-5 w-5 ${recurring.is_active ? 'text-green-500' : 'text-gray-500'}`} />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-3 mb-1">
                              <div className="font-semibold">{client?.name || 'Unknown Client'}</div>
                              <Badge variant={recurring.is_active ? 'default' : 'secondary'}>
                                {recurring.is_active ? 'Active' : 'Paused'}
                              </Badge>
                              <Badge variant="outline">
                                {getFrequencyLabel(recurring.frequency)}
                              </Badge>
                            </div>
                            {recurring.description && (
                              <p className="text-sm text-muted-foreground">{recurring.description}</p>
                            )}
                            <p className="text-xs text-muted-foreground mt-1">
                              Next invoice: {getNextRunDateLabel(recurring.next_run_date, recurring.frequency)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <div className="text-right">
                            <div className="font-semibold">
                              {recurring.currency} {recurring.amount.toFixed(2)}
                            </div>
                            <div className="text-xs text-muted-foreground">
                              {getFrequencyLabel(recurring.frequency)}
                            </div>
                          </div>
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => toggleRecurringInvoice({ 
                                id: recurring.id, 
                                is_active: !recurring.is_active 
                              })}
                              title={recurring.is_active ? 'Pause' : 'Resume'}
                            >
                              {recurring.is_active ? (
                                <Pause className="w-4 h-4" />
                              ) : (
                                <Play className="w-4 h-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => openEditRecurring(recurring)}
                            >
                              <Edit2 className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setDeletingRecurringId(recurring.id)}
                            >
                              <Trash2 className="w-4 h-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Invoice Detail Dialog */}
      <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Invoice {selectedInvoice?.invoice_number}</DialogTitle>
            <DialogDescription>
              {selectedInvoice && clients.find(c => c.id === selectedInvoice.client_id)?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Issue Date</div>
                  <div className="font-medium">
                    {new Date(selectedInvoice.issue_date).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Due Date</div>
                  <div className="font-medium">
                    {new Date(selectedInvoice.due_date).toLocaleDateString()}
                  </div>
                </div>
              </div>
              
              <div className="border rounded-lg p-6 space-y-4">
                <div className="flex justify-between items-center pb-4 border-b">
                  <div>
                    <div className="text-sm text-muted-foreground">Status</div>
                    <Badge variant="outline" className={getStatusColor(selectedInvoice.status)}>
                      {selectedInvoice.status}
                    </Badge>
                  </div>
                  <div className="text-right">
                    <div className="text-sm text-muted-foreground">Currency</div>
                    <div className="font-medium">{selectedInvoice.currency}</div>
                  </div>
                </div>
                
                <div className="space-y-2">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Subtotal</span>
                    <span className="font-medium">${selectedInvoice.subtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Tax ({(selectedInvoice.tax_rate * 100).toFixed(0)}%)
                    </span>
                    <span>${selectedInvoice.tax_amount.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between pt-2 border-t font-bold text-lg">
                    <span>Total</span>
                    <span>${selectedInvoice.total.toFixed(2)}</span>
                  </div>
                </div>

                {selectedInvoice.notes && (
                  <div className="pt-4 border-t">
                    <div className="text-sm text-muted-foreground mb-2">Notes</div>
                    <p className="text-sm">{selectedInvoice.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setSelectedInvoice(null)}>
              Close
            </Button>
            {selectedInvoice && (
              <Button onClick={() => generatePDF(selectedInvoice)}>
                <Download className="h-4 w-4 mr-2" />
                Download PDF
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!deletingRecurringId} onOpenChange={() => setDeletingRecurringId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Recurring Invoice</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this recurring invoice? This will stop all future automatic invoice generation.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => {
                if (deletingRecurringId) {
                  deleteRecurringInvoice(deletingRecurringId);
                  setDeletingRecurringId(null);
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
