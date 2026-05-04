"use client"

import { useEffect, useState } from "react"
import {
  Users,
  MoreVertical,
  Plus,
  ShieldCheck,
  UserCog,
  Headphones,
} from "lucide-react"
import { SettingsSectionCard } from "./settings-section-card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import {
  changeRole,
  getTeam,
  inviteMember,
  removeMember,
  ROLE_DESCRIPTIONS,
  ROLE_LABELS,
  seedTeamIfEmpty,
  subscribe,
  type TeamMember,
  type TeamRole,
  type TeamStore,
} from "@/lib/chidi/team"
import { useDashboardAuth } from "@/lib/providers/dashboard-auth-context"
import { cn } from "@/lib/utils"

const ROLE_ICON: Record<TeamRole, typeof ShieldCheck> = {
  owner: ShieldCheck,
  admin: UserCog,
  agent: Headphones,
}

function rolePillClass(role: TeamRole): string {
  switch (role) {
    case "owner":
      return "bg-[var(--chidi-accent-soft,rgba(0,200,83,0.12))] text-[var(--chidi-accent,#00C853)]"
    case "admin":
      return "bg-[var(--chidi-warning)]/12 text-[var(--chidi-warning)]"
    case "agent":
      return "bg-[var(--chidi-surface)] text-[var(--chidi-text-secondary)]"
  }
}

function initials(name: string): string {
  return (
    name
      .split(/\s+/)
      .map((n) => n[0])
      .filter(Boolean)
      .join("")
      .slice(0, 2)
      .toUpperCase() || "?"
  )
}

export function TeamSection() {
  const { user } = useDashboardAuth()
  const [store, setStore] = useState<TeamStore>({ members: [] })
  const [inviteEmail, setInviteEmail] = useState("")
  const [inviteRole, setInviteRole] = useState<TeamRole>("agent")
  const [inviteError, setInviteError] = useState("")

  // Seed-once with the current user as owner, then subscribe to changes.
  useEffect(() => {
    seedTeamIfEmpty({
      name: user?.name || "You",
      email: user?.email || "you@yourshop.ng",
    })
    const off = subscribe(setStore)
    return off
  }, [user?.name, user?.email])

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault()
    setInviteError("")
    const trimmed = inviteEmail.trim()
    if (!trimmed) {
      setInviteError("Enter an email")
      return
    }
    if (!trimmed.includes("@") || !trimmed.includes(".")) {
      setInviteError("That doesn't look like a valid email")
      return
    }
    if (
      store.members.some(
        (m) => m.email.toLowerCase() === trimmed.toLowerCase(),
      )
    ) {
      setInviteError("That email is already on your team")
      return
    }
    const result = inviteMember(trimmed, inviteRole)
    if (!result) {
      setInviteError("Couldn't send invite")
      return
    }
    setInviteEmail("")
    setInviteRole("agent")
  }

  return (
    <SettingsSectionCard
      eyebrow="Team"
      title="Who can sign in to your shop"
      description="Invite teammates and decide what each one sees."
    >
      {/* Invite form — email + role + send. */}
      <form
        onSubmit={handleInvite}
        className="flex flex-col sm:flex-row gap-2 mb-4"
      >
        <Input
          type="email"
          value={inviteEmail}
          onChange={(e) => {
            setInviteEmail(e.target.value)
            if (inviteError) setInviteError("")
          }}
          placeholder="teammate@email.com"
          className="flex-1 bg-[var(--chidi-surface)] border-[var(--chidi-border-subtle)]"
          aria-label="Email address to invite"
        />
        <Select
          value={inviteRole}
          onValueChange={(v) => setInviteRole(v as TeamRole)}
        >
          <SelectTrigger className="w-full sm:w-[140px] bg-[var(--chidi-surface)] border-[var(--chidi-border-subtle)]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="admin">Admin</SelectItem>
            <SelectItem value="agent">Agent</SelectItem>
          </SelectContent>
        </Select>
        <Button type="submit" className="btn-cta min-h-[40px]">
          <Plus className="w-3.5 h-3.5 mr-1.5" strokeWidth={2} />
          Invite
        </Button>
      </form>
      {inviteError && (
        <p
          role="alert"
          className="text-[12px] text-[var(--chidi-warning)] mb-3 -mt-2"
        >
          {inviteError}
        </p>
      )}

      {/* Members list */}
      <div className="rounded-xl border border-[var(--chidi-border-subtle)] overflow-hidden">
        {store.members.map((member, i) => (
          <MemberRow
            key={member.id}
            member={member}
            isFirst={i === 0}
            currentUserEmail={user?.email}
          />
        ))}
        {store.members.length === 0 && (
          <div className="px-4 py-6 text-center text-[13px] text-[var(--chidi-text-muted)]">
            <Users
              className="w-5 h-5 mx-auto mb-2 text-[var(--chidi-text-muted)]"
              strokeWidth={1.5}
            />
            No team members yet. Invite someone above.
          </div>
        )}
      </div>

      {/* Role legend */}
      <div className="mt-4 pt-4 border-t border-[var(--chidi-border-subtle)] grid grid-cols-1 sm:grid-cols-3 gap-3">
        {(Object.keys(ROLE_LABELS) as TeamRole[]).map((role) => {
          const Icon = ROLE_ICON[role]
          return (
            <div key={role} className="flex items-start gap-2">
              <Icon
                className="w-3.5 h-3.5 text-[var(--chidi-text-muted)] mt-0.5 flex-shrink-0"
                strokeWidth={1.8}
              />
              <div className="min-w-0">
                <p className="text-[12px] font-medium text-[var(--chidi-text-primary)]">
                  {ROLE_LABELS[role]}
                </p>
                <p className="text-[11px] text-[var(--chidi-text-muted)] leading-snug">
                  {ROLE_DESCRIPTIONS[role]}
                </p>
              </div>
            </div>
          )
        })}
      </div>
    </SettingsSectionCard>
  )
}

interface MemberRowProps {
  member: TeamMember
  isFirst: boolean
  currentUserEmail?: string
}

function MemberRow({ member, isFirst, currentUserEmail }: MemberRowProps) {
  const isSelf =
    !!currentUserEmail &&
    member.email.toLowerCase() === currentUserEmail.toLowerCase()
  const isOwner = member.role === "owner"
  // Owner can't be removed; self can't be removed either (loose guard).
  const canRemove = !isOwner && !isSelf

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-3 py-3",
        !isFirst && "border-t border-[var(--chidi-border-subtle)]",
      )}
    >
      {/* Avatar */}
      <div
        aria-hidden
        className="w-9 h-9 rounded-full bg-[var(--chidi-surface)] flex items-center justify-center text-[12px] font-semibold text-[var(--chidi-text-secondary)] flex-shrink-0"
      >
        {initials(member.name)}
      </div>

      {/* Identity */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="text-[13px] font-medium text-[var(--chidi-text-primary)] truncate">
            {member.name}
            {isSelf && (
              <span className="ml-1 text-[11px] text-[var(--chidi-text-muted)] font-normal">
                (you)
              </span>
            )}
          </p>
          <span
            className={cn(
              "text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-md font-medium",
              rolePillClass(member.role),
            )}
          >
            {ROLE_LABELS[member.role]}
          </span>
          {member.status === "pending" && (
            <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-md bg-[var(--chidi-warning)]/10 text-[var(--chidi-warning)] font-medium">
              Pending
            </span>
          )}
        </div>
        <p className="text-[11px] text-[var(--chidi-text-muted)] truncate mt-0.5">
          {member.email}
        </p>
      </div>

      {/* 3-dot menu */}
      {!isOwner ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              aria-label={`Manage ${member.name}`}
              className="flex-shrink-0 p-1.5 rounded-md text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-primary)] hover:bg-[var(--chidi-surface)] transition-colors"
            >
              <MoreVertical className="w-4 h-4" strokeWidth={1.8} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuLabel className="text-[10px] uppercase tracking-wider text-[var(--chidi-text-muted)]">
              Change role
            </DropdownMenuLabel>
            <DropdownMenuItem
              onClick={() => changeRole(member.id, "admin")}
              disabled={member.role === "admin"}
            >
              <UserCog className="w-3.5 h-3.5 mr-2" strokeWidth={1.8} />
              Admin
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => changeRole(member.id, "agent")}
              disabled={member.role === "agent"}
            >
              <Headphones className="w-3.5 h-3.5 mr-2" strokeWidth={1.8} />
              Agent
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => canRemove && removeMember(member.id)}
              disabled={!canRemove}
              className="text-red-600 focus:text-red-600"
            >
              Remove
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <span
          aria-label="Owner can't be modified here"
          className="flex-shrink-0 px-1.5 text-[10px] uppercase tracking-wider text-[var(--chidi-text-muted)]"
        >
          —
        </span>
      )}
    </div>
  )
}
