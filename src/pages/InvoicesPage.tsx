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
import { FileText, Plus, Download, Eye, DollarSign, Calendar } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { formatDurationShort } from "@/lib/utils-time";

interface Invoice {
  id: string;
  invoiceNumber: string;
  clientName: string;
  projectName: string;
  issueDate: string;
  dueDate: string;
  status: "draft" | "sent" | "paid" | "overdue";
  subtotal: number;
  taxRate: number;
  total: number;
  items: InvoiceItem[];
}

interface InvoiceItem {
  description: string;
  hours: number;
  rate: number;
  amount: number;
}

export default function InvoicesPage() {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<Invoice | null>(null);

  // TODO: Replace with actual data from Supabase when invoice hooks are created
  const invoices: Invoice[] = [];

  const generatePDF = (invoice: Invoice) => {
    const doc = new jsPDF();

    // Header
    doc.setFontSize(24);
    doc.text("INVOICE", 20, 20);

    doc.setFontSize(10);
    doc.text(`Invoice #: ${invoice.invoiceNumber}`, 20, 30);
    doc.text(`Issue Date: ${new Date(invoice.issueDate).toLocaleDateString()}`, 20, 35);
    doc.text(`Due Date: ${new Date(invoice.dueDate).toLocaleDateString()}`, 20, 40);

    // Client Info
    doc.setFontSize(12);
    doc.text("Bill To:", 20, 55);
    doc.setFontSize(10);
    doc.text(invoice.clientName, 20, 60);
    doc.text(invoice.projectName, 20, 65);

    // Company Info (right side)
    doc.setFontSize(10);
    doc.text("Your Company Name", 140, 55);
    doc.text("Your Address", 140, 60);
    doc.text("City, State ZIP", 140, 65);
    doc.text("your@email.com", 140, 70);

    // Invoice Items Table
    autoTable(doc, {
      startY: 80,
      head: [["Description", "Hours", "Rate", "Amount"]],
      body: invoice.items.map((item) => [
        item.description,
        item.hours.toFixed(2),
        `$${item.rate.toFixed(2)}`,
        `$${item.amount.toFixed(2)}`,
      ]),
      foot: [
        ["", "", "Subtotal:", `$${invoice.subtotal.toFixed(2)}`],
        ["", "", `Tax (${(invoice.taxRate * 100).toFixed(0)}%):`, `$${(invoice.subtotal * invoice.taxRate).toFixed(2)}`],
        ["", "", "Total:", `$${invoice.total.toFixed(2)}`],
      ],
      theme: "striped",
      headStyles: { fillColor: [0, 0, 0] },
      footStyles: { fillColor: [240, 240, 240], textColor: [0, 0, 0], fontStyle: "bold" },
    });

    // Payment Terms
    const finalY = (doc as any).lastAutoTable.finalY || 150;
    doc.setFontSize(10);
    doc.text("Payment Terms:", 20, finalY + 15);
    doc.text("Please pay within 15 days of receipt.", 20, finalY + 20);
    doc.text("Thank you for your business!", 20, finalY + 30);

    // Save PDF
    doc.save(`${invoice.invoiceNumber}.pdf`);
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
            {invoices.length} invoice{invoices.length !== 1 ? "s" : ""}
          </p>
        </div>

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
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
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
            {invoices.map((invoice) => (
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
                      <div className="font-semibold">{invoice.invoiceNumber}</div>
                      <Badge variant="outline" className={getStatusColor(invoice.status)}>
                        {invoice.status}
                      </Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {invoice.clientName} • {invoice.projectName}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right">
                    <div className="font-semibold">${invoice.total.toLocaleString()}</div>
                    <div className="text-sm text-muted-foreground">
                      Due {new Date(invoice.dueDate).toLocaleDateString()}
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
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Invoice Detail Dialog */}
      <Dialog open={!!selectedInvoice} onOpenChange={() => setSelectedInvoice(null)}>
        <DialogContent className="max-w-3xl">
          <DialogHeader>
            <DialogTitle>Invoice {selectedInvoice?.invoiceNumber}</DialogTitle>
            <DialogDescription>
              {selectedInvoice?.clientName} • {selectedInvoice?.projectName}
            </DialogDescription>
          </DialogHeader>
          {selectedInvoice && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="text-muted-foreground">Issue Date</div>
                  <div className="font-medium">
                    {new Date(selectedInvoice.issueDate).toLocaleDateString()}
                  </div>
                </div>
                <div>
                  <div className="text-muted-foreground">Due Date</div>
                  <div className="font-medium">
                    {new Date(selectedInvoice.dueDate).toLocaleDateString()}
                  </div>
                </div>
              </div>
              
              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-muted">
                    <tr>
                      <th className="text-left p-3 text-sm font-medium">Description</th>
                      <th className="text-right p-3 text-sm font-medium">Hours</th>
                      <th className="text-right p-3 text-sm font-medium">Rate</th>
                      <th className="text-right p-3 text-sm font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedInvoice.items.map((item, index) => (
                      <tr key={index} className="border-t">
                        <td className="p-3">{item.description}</td>
                        <td className="text-right p-3">{item.hours.toFixed(2)}</td>
                        <td className="text-right p-3">${item.rate.toFixed(2)}</td>
                        <td className="text-right p-3 font-medium">${item.amount.toFixed(2)}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot className="border-t bg-muted/50">
                    <tr>
                      <td colSpan={3} className="text-right p-3 font-medium">Subtotal</td>
                      <td className="text-right p-3 font-medium">${selectedInvoice.subtotal.toFixed(2)}</td>
                    </tr>
                    <tr>
                      <td colSpan={3} className="text-right p-3 text-sm">
                        Tax ({(selectedInvoice.taxRate * 100).toFixed(0)}%)
                      </td>
                      <td className="text-right p-3">${(selectedInvoice.subtotal * selectedInvoice.taxRate).toFixed(2)}</td>
                    </tr>
                    <tr className="font-bold">
                      <td colSpan={3} className="text-right p-3">Total</td>
                      <td className="text-right p-3">${selectedInvoice.total.toFixed(2)}</td>
                    </tr>
                  </tfoot>
                </table>
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
    </div>
  );
}
