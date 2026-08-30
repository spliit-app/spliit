'use client'

import { PreAuthorizeModal } from '@/app/admin/pre-authorize-modal'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Input } from '@/components/ui/input'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/components/ui/use-toast'
import { UserTier } from '@/lib/enums'
import { trpc } from '@/trpc/client'
import {
  ArrowLeft,
  ChevronLeft,
  ChevronRight,
  Clock,
  CreditCard,
  ExternalLink,
  FolderPlus,
  Folders,
  Loader2,
  MoreHorizontal,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  Trash2,
  UserCheck,
  Users,
} from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useState } from 'react'

export function AdminDashboard() {
  const [activeTab, setActiveTab] = useState('users')
  const { toast } = useToast()
  const utils = trpc.useUtils()

  // Metrics
  const metricsQuery = trpc.admin.getMetrics.useQuery()

  // User Management State
  const [userPage, setUserPage] = useState(1)
  const [userSearch, setUserSearch] = useState('')
  const [tierFilter, setTierFilter] = useState('all')

  const usersQuery = trpc.admin.listUsers.useQuery({
    page: userPage,
    limit: 10,
    search: userSearch.trim() || undefined,
    tier: tierFilter,
  })

  // Group Management State
  const [groupPage, setGroupPage] = useState(1)
  const [groupSearch, setGroupSearch] = useState('')

  const groupsQuery = trpc.admin.listGroups.useQuery({
    page: groupPage,
    limit: 10,
    search: groupSearch.trim() || undefined,
  })

  // Mutations
  const updateUserTierMutation = trpc.admin.updateUserTier.useMutation()
  const deleteUserMutation = trpc.admin.deleteUser.useMutation()
  const deleteGroupMutation = trpc.admin.deleteGroup.useMutation()

  const handleTierChange = async (userId: string, newTier: UserTier) => {
    try {
      await updateUserTierMutation.mutateAsync({
        userId,
        tier: newTier,
      })
      await utils.admin.invalidate()
      toast({
        title: 'Tier updated',
        description: `User role has been updated to ${newTier.replace('_', ' ')}.`,
      })
    } catch (err: any) {
      toast({
        title: 'Failed to update tier',
        description: err?.message || 'An error occurred.',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteUser = async (userId: string, email: string | null) => {
    if (
      !confirm(
        `Are you sure you want to remove user "${email || userId}"? This cannot be undone.`,
      )
    ) {
      return
    }

    try {
      await deleteUserMutation.mutateAsync({ userId })
      await utils.admin.invalidate()
      toast({
        title: 'User removed',
        description: 'User record was deleted.',
      })
    } catch (err: any) {
      toast({
        title: 'Failed to remove user',
        description: err?.message || 'An error occurred.',
        variant: 'destructive',
      })
    }
  }

  const handleDeleteGroup = async (groupId: string, groupName: string) => {
    if (
      !confirm(
        `Are you sure you want to delete group "${groupName}" (${groupId})?\n\nThis will permanently delete all associated expenses, participants, and activity history.`,
      )
    ) {
      return
    }

    try {
      await deleteGroupMutation.mutateAsync({ groupId })
      await utils.admin.invalidate()
      await utils.groups.invalidate()
      toast({
        title: 'Group deleted',
        description: `Group "${groupName}" has been permanently removed.`,
      })
    } catch (err: any) {
      toast({
        title: 'Failed to delete group',
        description: err?.message || 'An error occurred.',
        variant: 'destructive',
      })
    }
  }

  const isUpdating =
    updateUserTierMutation.isPending ||
    deleteUserMutation.isPending ||
    deleteGroupMutation.isPending

  return (
    <div className="container max-w-6xl mx-auto px-4 py-8 space-y-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Link
              href="/groups"
              className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Back to Groups
            </Link>
          </div>
          <h1 className="text-3xl font-bold tracking-tight flex items-center gap-2.5">
            <Shield className="w-7 h-7 text-primary" />
            Administration Dashboard
          </h1>
          <p className="text-muted-foreground text-sm mt-1">
            Manage user accounts, view and delete expense groups, and monitor
            system metrics.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <PreAuthorizeModal
            onSuccess={() => {
              usersQuery.refetch()
              metricsQuery.refetch()
            }}
          />
          <Button
            variant="outline"
            size="sm"
            className="gap-1.5"
            onClick={() => {
              metricsQuery.refetch()
              usersQuery.refetch()
              groupsQuery.refetch()
            }}
          >
            <RefreshCw
              className={`w-3.5 h-3.5 ${
                metricsQuery.isFetching ||
                usersQuery.isFetching ||
                groupsQuery.isFetching
                  ? 'animate-spin'
                  : ''
              }`}
            />
            Refresh
          </Button>
        </div>
      </div>

      {/* Metrics Cards */}
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Groups</CardTitle>
            <FolderPlus className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metricsQuery.isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              ) : (
                (metricsQuery.data?.totalGroups ?? 0)
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Active expense groups on this instance
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total Expenses
            </CardTitle>
            <CreditCard className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metricsQuery.isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              ) : (
                (metricsQuery.data?.totalExpenses ?? 0)
              )}
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Transactions recorded across all groups
            </p>
          </CardContent>
        </Card>

        <Card className="shadow-sm">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Registered Users
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {metricsQuery.isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
              ) : (
                (metricsQuery.data?.totalUsers ?? 0)
              )}
            </div>
            <div className="flex flex-wrap gap-1.5 mt-2">
              <Badge
                variant="secondary"
                className="text-[11px] font-normal gap-1"
              >
                <UserCheck className="w-3 h-3" />
                Sync: {metricsQuery.data?.tierCounts[UserTier.SYNC_USERS] ?? 0}
              </Badge>
              <Badge
                variant="default"
                className="text-[11px] font-normal gap-1"
              >
                <Sparkles className="w-3 h-3" />
                Creators:{' '}
                {metricsQuery.data?.tierCounts[UserTier.GROUP_CREATORS] ?? 0}
              </Badge>
              <Badge
                variant="destructive"
                className="text-[11px] font-normal gap-1"
              >
                <Shield className="w-3 h-3" />
                Admins: {metricsQuery.data?.tierCounts[UserTier.ADMIN] ?? 0}
              </Badge>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Tabs for Users and Groups */}
      <Tabs
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsList className="grid w-full sm:w-80 grid-cols-2">
          <TabsTrigger value="users" className="gap-1.5">
            <Users className="w-4 h-4" />
            <span>Users ({metricsQuery.data?.totalUsers ?? 0})</span>
          </TabsTrigger>
          <TabsTrigger value="groups" className="gap-1.5">
            <Folders className="w-4 h-4" />
            <span>Groups ({metricsQuery.data?.totalGroups ?? 0})</span>
          </TabsTrigger>
        </TabsList>

        {/* Tab 1: Users Management */}
        <TabsContent value="users">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle>User Accounts & Permission Tiers</CardTitle>
                <CardDescription>
                  View registered users and pre-authorize friends with Group
                  Creator tier before they log in.
                </CardDescription>
              </div>
              <PreAuthorizeModal
                onSuccess={() => {
                  usersQuery.refetch()
                  metricsQuery.refetch()
                }}
              />
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Filters & Search */}
              <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by name or email..."
                    value={userSearch}
                    onChange={(e) => {
                      setUserSearch(e.target.value)
                      setUserPage(1)
                    }}
                    className="pl-9 h-9 text-sm"
                  />
                </div>

                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <span className="text-xs text-muted-foreground whitespace-nowrap">
                    Filter Tier:
                  </span>
                  <Select
                    value={tierFilter}
                    onValueChange={(val) => {
                      setTierFilter(val)
                      setUserPage(1)
                    }}
                  >
                    <SelectTrigger className="w-full sm:w-44 h-9 text-xs">
                      <SelectValue placeholder="All Tiers" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Tiers</SelectItem>
                      <SelectItem value={UserTier.SYNC_USERS}>
                        Sync Users
                      </SelectItem>
                      <SelectItem value={UserTier.GROUP_CREATORS}>
                        Group Creators
                      </SelectItem>
                      <SelectItem value={UserTier.ADMIN}>
                        Administrators
                      </SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {/* Users Table */}
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>User</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Joined</TableHead>
                      <TableHead>Groups</TableHead>
                      <TableHead>Current Tier</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {usersQuery.isLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <div className="flex items-center justify-center gap-2 text-muted-foreground">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Loading users...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : !usersQuery.data?.users.length ? (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="text-center py-8 text-muted-foreground text-sm"
                        >
                          No users found matching your search or filters.
                        </TableCell>
                      </TableRow>
                    ) : (
                      usersQuery.data.users.map((user) => {
                        const tierBadgeVariant =
                          user.tier === UserTier.ADMIN
                            ? 'destructive'
                            : user.tier === UserTier.GROUP_CREATORS
                              ? 'default'
                              : 'secondary'

                        const isPendingLogin = user.providers.length === 0

                        return (
                          <TableRow key={user.id}>
                            <TableCell className="font-medium">
                              <div className="flex items-center gap-2.5">
                                {user.image ? (
                                  <Image
                                    src={user.image}
                                    alt={user.name || 'User'}
                                    width={28}
                                    height={28}
                                    className="rounded-full object-cover"
                                  />
                                ) : (
                                  <div className="w-7 h-7 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs">
                                    {user.name
                                      ? user.name.charAt(0).toUpperCase()
                                      : 'U'}
                                  </div>
                                )}
                                <span>
                                  {user.name ||
                                    (isPendingLogin
                                      ? 'Pre-authorized'
                                      : 'Unnamed')}
                                </span>
                              </div>
                            </TableCell>
                            <TableCell className="text-muted-foreground text-xs font-mono">
                              {user.email || '—'}
                            </TableCell>
                            <TableCell>
                              {isPendingLogin ? (
                                <Badge
                                  variant="outline"
                                  className="text-[10px] text-amber-600 dark:text-amber-400 gap-1 border-amber-500/30"
                                >
                                  <Clock className="w-2.5 h-2.5" />
                                  Pending Login
                                </Badge>
                              ) : (
                                <Badge
                                  variant="secondary"
                                  className="text-[10px] gap-1"
                                >
                                  <UserCheck className="w-2.5 h-2.5 text-emerald-500" />
                                  Active ({user.providers.join(', ') || 'OAuth'}
                                  )
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell className="text-muted-foreground text-xs">
                              {new Date(user.createdAt).toLocaleDateString()}
                            </TableCell>
                            <TableCell className="text-xs">
                              <Badge variant="outline" className="text-[10px]">
                                {user.groupsCount} groups
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Badge
                                variant={tierBadgeVariant}
                                className="text-xs font-normal"
                              >
                                {user.tier === UserTier.ADMIN
                                  ? 'Admin'
                                  : user.tier === UserTier.GROUP_CREATORS
                                    ? 'Group Creator'
                                    : 'Sync User'}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex items-center justify-end gap-1.5">
                                <Select
                                  value={user.tier}
                                  disabled={isUpdating}
                                  onValueChange={(newTier) =>
                                    handleTierChange(
                                      user.id,
                                      newTier as UserTier,
                                    )
                                  }
                                >
                                  <SelectTrigger className="w-32 h-8 text-xs">
                                    <SelectValue />
                                  </SelectTrigger>
                                  <SelectContent align="end">
                                    <SelectItem value={UserTier.SYNC_USERS}>
                                      Sync User
                                    </SelectItem>
                                    <SelectItem value={UserTier.GROUP_CREATORS}>
                                      Group Creator
                                    </SelectItem>
                                    <SelectItem value={UserTier.ADMIN}>
                                      Admin
                                    </SelectItem>
                                  </SelectContent>
                                </Select>

                                <DropdownMenu>
                                  <DropdownMenuTrigger asChild>
                                    <Button
                                      variant="ghost"
                                      size="icon"
                                      className="h-8 w-8"
                                    >
                                      <MoreHorizontal className="w-4 h-4" />
                                    </Button>
                                  </DropdownMenuTrigger>
                                  <DropdownMenuContent align="end">
                                    <DropdownMenuItem
                                      className="text-destructive focus:text-destructive gap-2 cursor-pointer"
                                      onClick={() =>
                                        handleDeleteUser(user.id, user.email)
                                      }
                                    >
                                      <Trash2 className="w-3.5 h-3.5" />
                                      <span>Remove user</span>
                                    </DropdownMenuItem>
                                  </DropdownMenuContent>
                                </DropdownMenu>
                              </div>
                            </TableCell>
                          </TableRow>
                        )
                      })
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* User Pagination */}
              {usersQuery.data && usersQuery.data.totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-muted-foreground">
                    Page {usersQuery.data.page} of {usersQuery.data.totalPages}{' '}
                    ({usersQuery.data.total} total users)
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={userPage <= 1}
                      onClick={() => setUserPage((p) => Math.max(1, p - 1))}
                      className="h-8 gap-1 text-xs"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={userPage >= usersQuery.data.totalPages}
                      onClick={() =>
                        setUserPage((p) =>
                          Math.min(usersQuery.data!.totalPages, p + 1),
                        )
                      }
                      className="h-8 gap-1 text-xs"
                    >
                      Next
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Tab 2: Groups Management */}
        <TabsContent value="groups">
          <Card className="shadow-sm">
            <CardHeader className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <CardTitle>Expense Groups Management</CardTitle>
                <CardDescription>
                  View all active expense groups on the platform, open them
                  directly, or remove test/unwanted groups.
                </CardDescription>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Search */}
              <div className="flex items-center justify-between">
                <div className="relative w-full sm:w-72">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search by group name or ID..."
                    value={groupSearch}
                    onChange={(e) => {
                      setGroupSearch(e.target.value)
                      setGroupPage(1)
                    }}
                    className="pl-9 h-9 text-sm"
                  />
                </div>
              </div>

              {/* Groups Table */}
              <div className="rounded-md border overflow-hidden">
                <Table>
                  <TableHeader className="bg-muted/50">
                    <TableRow>
                      <TableHead>Group Name</TableHead>
                      <TableHead>Group ID</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead>Participants</TableHead>
                      <TableHead>Expenses</TableHead>
                      <TableHead>Currency</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupsQuery.isLoading ? (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-8">
                          <div className="flex items-center justify-center gap-2 text-muted-foreground">
                            <Loader2 className="w-4 h-4 animate-spin" />
                            <span>Loading groups...</span>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : !groupsQuery.data?.groups.length ? (
                      <TableRow>
                        <TableCell
                          colSpan={7}
                          className="text-center py-8 text-muted-foreground text-sm"
                        >
                          No groups found matching your search.
                        </TableCell>
                      </TableRow>
                    ) : (
                      groupsQuery.data.groups.map((group) => (
                        <TableRow key={group.id}>
                          <TableCell className="font-medium">
                            <Link
                              href={`/groups/${group.id}`}
                              className="text-primary hover:underline flex items-center gap-1.5"
                            >
                              <span>{group.name}</span>
                              <ExternalLink className="w-3 h-3 opacity-60" />
                            </Link>
                          </TableCell>
                          <TableCell className="font-mono text-xs text-muted-foreground">
                            {group.id}
                          </TableCell>
                          <TableCell className="text-muted-foreground text-xs">
                            {new Date(group.createdAt).toLocaleDateString()}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-xs">
                              {group.participantsCount} participants
                            </Badge>
                          </TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="text-xs">
                              {group.expensesCount} expenses
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground font-mono">
                            {group.currencyCode || group.currency || 'USD'} (
                            {group.currency})
                          </TableCell>
                          <TableCell className="text-right">
                            <div className="flex items-center justify-end gap-2">
                              <Button
                                variant="outline"
                                size="sm"
                                asChild
                                className="h-8 text-xs gap-1"
                              >
                                <Link href={`/groups/${group.id}`}>
                                  <ExternalLink className="w-3.5 h-3.5" />
                                  View
                                </Link>
                              </Button>

                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8 text-destructive hover:text-destructive hover:bg-destructive/10"
                                onClick={() =>
                                  handleDeleteGroup(group.id, group.name)
                                }
                                disabled={isUpdating}
                              >
                                <Trash2 className="w-4 h-4" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>

              {/* Group Pagination */}
              {groupsQuery.data && groupsQuery.data.totalPages > 1 && (
                <div className="flex items-center justify-between pt-2">
                  <span className="text-xs text-muted-foreground">
                    Page {groupsQuery.data.page} of{' '}
                    {groupsQuery.data.totalPages} ({groupsQuery.data.total}{' '}
                    total groups)
                  </span>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={groupPage <= 1}
                      onClick={() => setGroupPage((p) => Math.max(1, p - 1))}
                      className="h-8 gap-1 text-xs"
                    >
                      <ChevronLeft className="w-3.5 h-3.5" />
                      Previous
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={groupPage >= groupsQuery.data.totalPages}
                      onClick={() =>
                        setGroupPage((p) =>
                          Math.min(groupsQuery.data!.totalPages, p + 1),
                        )
                      }
                      className="h-8 gap-1 text-xs"
                    >
                      Next
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
