import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Users, UserPlus, Mail, Shield, Crown, User as UserIcon, Loader2, UserMinus, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
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
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useTeam } from "@/hooks/useTeam";
import { useAuth } from "@/contexts/AuthContext";

export default function TeamPage() {
  const [isInviteOpen, setIsInviteOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"user" | "project_manager" | "admin">("user");
  const [memberToRemove, setMemberToRemove] = useState<string | null>(null);

  const { user: currentUser } = useAuth();
  const { 
    members, 
    isLoading,
    error,
    inviteMember, 
    updateRole, 
    removeMember,
    isInviting,
    isUpdatingRole,
    isRemoving
  } = useTeam();

  // Get current user's role
  const currentUserData = members.find(m => m.id === currentUser?.id);
  const isAdmin = currentUserData?.role === 'admin';

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    inviteMember({ email: inviteEmail, role: inviteRole });
    setIsInviteOpen(false);
    setInviteEmail("");
    setInviteRole("user");
  };

  const handleRoleChange = (userId: string, newRole: 'admin' | 'project_manager' | 'user') => {
    updateRole({ userId, role: newRole });
  };

  const handleRemoveMember = () => {
    if (memberToRemove) {
      removeMember(memberToRemove);
      setMemberToRemove(null);
    }
  };

  const getRoleIcon = (role: string) => {
    switch (role) {
      case "admin":
        return <Crown className="h-4 w-4" />;
      case "project_manager":
        return <Shield className="h-4 w-4" />;
      default:
        return <UserIcon className="h-4 w-4" />;
    }
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case "admin":
        return "bg-purple-500/10 text-purple-500 border-purple-500/20";
      case "project_manager":
        return "bg-blue-500/10 text-blue-500 border-blue-500/20";
      default:
        return "bg-gray-500/10 text-gray-500 border-gray-500/20";
    }
  };

  // Show warning if database error (tables don't exist)
  const isDatabaseError = error && (error.message?.includes('404') || (error as any).code === 'PGRST116');

  return (
    <div className="container mx-auto px-8 py-8">
      {isDatabaseError && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Database Not Set Up</AlertTitle>
          <AlertDescription>
            The database tables haven't been created yet. Please run the migration first.
            <br />
            <span className="text-sm mt-2 block">
              Run: <code className="bg-black/10 px-2 py-1 rounded">./run-migration.sh</code> in your terminal
            </span>
          </AlertDescription>
        </Alert>
      )}

      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team</h1>
          <p className="text-sm text-muted-foreground mt-2">
            {isLoading ? "Loading..." : `${members.length} team member${members.length !== 1 ? "s" : ""}`}
          </p>
        </div>

        {isAdmin && (
          <Dialog open={isInviteOpen} onOpenChange={setIsInviteOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Member
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Invite Team Member</DialogTitle>
                <DialogDescription>
                  Send an invitation to join your team. They'll receive an email with instructions.
                </DialogDescription>
              </DialogHeader>
              <form onSubmit={handleInvite}>
                <div className="grid gap-4 py-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email Address</Label>
                    <Input
                      id="email"
                      type="email"
                      placeholder="colleague@company.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="role">Role</Label>
                    <Select value={inviteRole} onValueChange={(value: any) => setInviteRole(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="user">
                          <div className="flex items-center gap-2">
                            <UserIcon className="h-4 w-4" />
                            <span>User - Can track own time</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="project_manager">
                          <div className="flex items-center gap-2">
                            <Shield className="h-4 w-4" />
                            <span>Project Manager - Can manage projects and view team data</span>
                          </div>
                        </SelectItem>
                        <SelectItem value="admin">
                          <div className="flex items-center gap-2">
                            <Crown className="h-4 w-4" />
                            <span>Admin - Full access to all features</span>
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setIsInviteOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={isInviting}>
                    {isInviting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                    Send Invitation
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {isLoading ? (
        <div className="grid gap-6">
          {/* Stats Skeletons */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {[1, 2, 3].map((i) => (
              <Card key={i}>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <Skeleton className="h-4 w-24" />
                  <Skeleton className="h-4 w-4" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-12" />
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Members List Skeleton */}
          <Card>
            <CardHeader>
              <Skeleton className="h-6 w-32 mb-2" />
              <Skeleton className="h-4 w-64" />
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="flex items-center gap-4">
                      <Skeleton className="h-10 w-10 rounded-full" />
                      <div>
                        <Skeleton className="h-5 w-32 mb-2" />
                        <Skeleton className="h-4 w-48" />
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Skeleton className="h-4 w-24" />
                      <Skeleton className="h-6 w-20" />
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="grid gap-6">
          {/* Team Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Total Members</CardTitle>
                <Users className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{members.length}</div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Admins</CardTitle>
                <Crown className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {members.filter((m) => m.role === "admin").length}
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">Project Managers</CardTitle>
                <Shield className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {members.filter((m) => m.role === "project_manager").length}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Team Members List */}
          <Card>
            <CardHeader>
              <CardTitle>Team Members</CardTitle>
              <CardDescription>Manage your team members and their roles</CardDescription>
            </CardHeader>
            <CardContent>
              {members.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-20" />
                  <p>No team members yet.</p>
                  {isAdmin && <p className="text-sm mt-2">Click "Invite Member" to get started.</p>}
                </div>
              ) : (
                <div className="space-y-4">
                  {members.map((member) => (
                    <div
                      key={member.id}
                      className="flex items-center justify-between p-4 rounded-lg border border-border hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                          <span className="text-sm font-semibold text-primary">
                            {member.full_name
                              ? member.full_name.split(" ").map((n) => n[0]).join("")
                              : member.email[0].toUpperCase()}
                          </span>
                        </div>
                        <div>
                          <div className="font-medium">{member.full_name || member.email}</div>
                          <div className="flex items-center gap-2 text-sm text-muted-foreground">
                            <Mail className="h-3 w-3" />
                            {member.email}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-sm text-muted-foreground">
                          Joined {new Date(member.created_at).toLocaleDateString()}
                        </div>
                        <Badge
                          variant="outline"
                          className={`${getRoleColor(member.role)} flex items-center gap-1`}
                        >
                          {getRoleIcon(member.role)}
                          {member.role.replace("_", " ")}
                        </Badge>
                        {isAdmin && member.id !== currentUser?.id && (
                          <>
                            <Select 
                              defaultValue={member.role}
                              onValueChange={(value: any) => handleRoleChange(member.id, value)}
                              disabled={isUpdatingRole}
                            >
                              <SelectTrigger className="w-[180px]">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="user">User</SelectItem>
                                <SelectItem value="project_manager">Project Manager</SelectItem>
                                <SelectItem value="admin">Admin</SelectItem>
                              </SelectContent>
                            </Select>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setMemberToRemove(member.id)}
                              disabled={isRemoving}
                            >
                              <UserMinus className="h-4 w-4 text-destructive" />
                            </Button>
                          </>
                        )}
                        {member.id === currentUser?.id && (
                          <Badge variant="secondary">You</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Role Permissions Info */}
          <Card>
            <CardHeader>
              <CardTitle>Role Permissions</CardTitle>
              <CardDescription>Understanding team member roles and their capabilities</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4">
                <div className="flex gap-3">
                  <div className="mt-1">
                    <Crown className="h-5 w-5 text-purple-500" />
                  </div>
                  <div>
                    <div className="font-semibold">Admin</div>
                    <div className="text-sm text-muted-foreground">
                      Full system access including team management, billing, all projects and time entries
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="mt-1">
                    <Shield className="h-5 w-5 text-blue-500" />
                  </div>
                  <div>
                    <div className="font-semibold">Project Manager</div>
                    <div className="text-sm text-muted-foreground">
                      Can manage projects, clients, view team time entries, and generate reports
                    </div>
                  </div>
                </div>
                <div className="flex gap-3">
                  <div className="mt-1">
                    <UserIcon className="h-5 w-5 text-gray-500" />
                  </div>
                  <div>
                    <div className="font-semibold">User</div>
                    <div className="text-sm text-muted-foreground">
                      Can track their own time, view assigned projects, and export their own data
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Remove Member Confirmation Dialog */}
      <AlertDialog open={!!memberToRemove} onOpenChange={() => setMemberToRemove(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove Team Member</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to remove this member from the team? They will lose access to all team data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleRemoveMember} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Remove Member
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
