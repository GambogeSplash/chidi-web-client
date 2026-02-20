"use client"

import { useState, useEffect } from 'react'
import { HelpCircle, ScrollText, Plus, Pencil, Trash2, Loader2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { policiesAPI, type BusinessPolicy, type PolicyType } from '@/lib/api/policies'

interface PolicySettingsProps {
  businessId: string
}

interface PolicyFormData {
  type: PolicyType
  title: string
  content: string
}

export function PolicySettings({ businessId }: PolicySettingsProps) {
  const [activeTab, setActiveTab] = useState<'faqs' | 'rules'>('faqs')
  const [faqs, setFaqs] = useState<BusinessPolicy[]>([])
  const [rules, setRules] = useState<BusinessPolicy[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingItem, setEditingItem] = useState<BusinessPolicy | null>(null)
  const [formData, setFormData] = useState<PolicyFormData>({ type: 'FAQ', title: '', content: '' })

  useEffect(() => {
    if (businessId) {
      loadPolicies()
    }
  }, [businessId])

  const loadPolicies = async () => {
    try {
      setLoading(true)
      setError(null)
      const [faqsData, rulesData] = await Promise.all([
        policiesAPI.getFAQs(businessId),
        policiesAPI.getRules(businessId)
      ])

      // Auto-initialize defaults if both are empty (first visit)
      if (faqsData.length === 0 && rulesData.length === 0) {
        await policiesAPI.initializeDefaults(businessId)
        // Reload after initialization
        const [newFaqs, newRules] = await Promise.all([
          policiesAPI.getFAQs(businessId),
          policiesAPI.getRules(businessId)
        ])
        setFaqs(newFaqs)
        setRules(newRules)
      } else {
        setFaqs(faqsData)
        setRules(rulesData)
      }
    } catch (err) {
      console.error('Failed to load policies:', err)
      setError('Failed to load policies')
    } finally {
      setLoading(false)
    }
  }

  const handleAddItem = (type: PolicyType) => {
    setFormData({ type, title: '', content: '' })
    setShowAddModal(true)
  }

  const handleEditItem = (item: BusinessPolicy) => {
    setEditingItem(item)
    setFormData({
      type: item.type,
      title: item.title,
      content: item.content
    })
    setShowEditModal(true)
  }

  const handleDeleteItem = async (item: BusinessPolicy) => {
    if (!confirm('Are you sure you want to delete this item?')) return

    try {
      await policiesAPI.delete(businessId, item.id)
      if (item.type === 'FAQ') {
        setFaqs(prev => prev.filter(f => f.id !== item.id))
      } else {
        setRules(prev => prev.filter(r => r.id !== item.id))
      }
    } catch (err) {
      console.error('Failed to delete policy:', err)
      setError('Failed to delete item')
    }
  }

  const handleSaveNew = async () => {
    if (!formData.title.trim() || !formData.content.trim()) return

    try {
      setSaving(true)
      const newItem = await policiesAPI.create(businessId, {
        type: formData.type,
        title: formData.title.trim(),
        content: formData.content.trim()
      })
      
      if (formData.type === 'FAQ') {
        setFaqs(prev => [...prev, newItem])
      } else {
        setRules(prev => [...prev, newItem])
      }
      
      setShowAddModal(false)
      setFormData({ type: 'FAQ', title: '', content: '' })
    } catch (err) {
      console.error('Failed to create policy:', err)
      setError('Failed to create item')
    } finally {
      setSaving(false)
    }
  }

  const handleSaveEdit = async () => {
    if (!editingItem || !formData.title.trim() || !formData.content.trim()) return

    try {
      setSaving(true)
      const updatedItem = await policiesAPI.update(businessId, editingItem.id, {
        title: formData.title.trim(),
        content: formData.content.trim()
      })
      
      if (editingItem.type === 'FAQ') {
        setFaqs(prev => prev.map(f => f.id === editingItem.id ? updatedItem : f))
      } else {
        setRules(prev => prev.map(r => r.id === editingItem.id ? updatedItem : r))
      }
      
      setShowEditModal(false)
      setEditingItem(null)
      setFormData({ type: 'FAQ', title: '', content: '' })
    } catch (err) {
      console.error('Failed to update policy:', err)
      setError('Failed to update item')
    } finally {
      setSaving(false)
    }
  }

  const handleInitializeDefaults = async () => {
    try {
      setLoading(true)
      await policiesAPI.initializeDefaults(businessId)
      await loadPolicies()
    } catch (err) {
      console.error('Failed to initialize defaults:', err)
      setError('Failed to initialize defaults')
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 animate-spin text-[var(--chidi-text-muted)]" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
          {error}
        </div>
      )}

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'faqs' | 'rules')}>
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="faqs" className="flex items-center gap-2">
            <HelpCircle className="w-4 h-4" />
            FAQs ({faqs.length})
          </TabsTrigger>
          <TabsTrigger value="rules" className="flex items-center gap-2">
            <ScrollText className="w-4 h-4" />
            Rules ({rules.length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value="faqs" className="mt-4 space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-sm text-[var(--chidi-text-muted)]">
              Common questions your AI can answer
            </p>
            <Button size="sm" onClick={() => handleAddItem('FAQ')}>
              <Plus className="w-4 h-4 mr-1" />
              Add FAQ
            </Button>
          </div>
          
          {faqs.length === 0 ? (
            <EmptyState
              type="FAQ"
              onAdd={() => handleAddItem('FAQ')}
              onInitialize={handleInitializeDefaults}
            />
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {faqs.map((faq) => (
                <PolicyCard
                  key={faq.id}
                  item={faq}
                  onEdit={handleEditItem}
                  onDelete={handleDeleteItem}
                />
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="rules" className="mt-4 space-y-3">
          <div className="flex justify-between items-center">
            <p className="text-sm text-[var(--chidi-text-muted)]">
              Business rules and policies your AI follows
            </p>
            <Button size="sm" onClick={() => handleAddItem('RULE')}>
              <Plus className="w-4 h-4 mr-1" />
              Add Rule
            </Button>
          </div>
          
          {rules.length === 0 ? (
            <EmptyState
              type="RULE"
              onAdd={() => handleAddItem('RULE')}
              onInitialize={handleInitializeDefaults}
            />
          ) : (
            <div className="space-y-2 max-h-[400px] overflow-y-auto">
              {rules.map((rule) => (
                <PolicyCard
                  key={rule.id}
                  item={rule}
                  onEdit={handleEditItem}
                  onDelete={handleDeleteItem}
                />
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Add Modal */}
      <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {formData.type === 'FAQ' ? 'Add FAQ' : 'Add Business Rule'}
            </DialogTitle>
            <DialogDescription>
              {formData.type === 'FAQ'
                ? 'Add a question and answer your AI can use to help customers.'
                : 'Add a rule or policy your AI should follow.'}
            </DialogDescription>
          </DialogHeader>
          <PolicyForm
            formData={formData}
            setFormData={setFormData}
            onSave={handleSaveNew}
            onCancel={() => setShowAddModal(false)}
            saving={saving}
            isFaq={formData.type === 'FAQ'}
          />
        </DialogContent>
      </Dialog>

      {/* Edit Modal */}
      <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingItem?.type === 'FAQ' ? 'Edit FAQ' : 'Edit Business Rule'}
            </DialogTitle>
          </DialogHeader>
          <PolicyForm
            formData={formData}
            setFormData={setFormData}
            onSave={handleSaveEdit}
            onCancel={() => {
              setShowEditModal(false)
              setEditingItem(null)
            }}
            saving={saving}
            isFaq={editingItem?.type === 'FAQ'}
          />
        </DialogContent>
      </Dialog>
    </div>
  )
}

// Policy Card Component
function PolicyCard({
  item,
  onEdit,
  onDelete
}: {
  item: BusinessPolicy
  onEdit: (item: BusinessPolicy) => void
  onDelete: (item: BusinessPolicy) => void
}) {
  return (
    <div className="bg-[var(--chidi-surface)] border border-[var(--chidi-border-subtle)] rounded-lg p-3">
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <h4 className="font-medium text-sm text-[var(--chidi-text-primary)] truncate">
            {item.title}
          </h4>
          <p className="text-xs text-[var(--chidi-text-muted)] mt-1 line-clamp-2">
            {item.content}
          </p>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-[var(--chidi-text-muted)] hover:text-[var(--chidi-text-primary)]"
            onClick={() => onEdit(item)}
          >
            <Pencil className="w-3.5 h-3.5" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7 text-[var(--chidi-text-muted)] hover:text-red-600"
            onClick={() => onDelete(item)}
          >
            <Trash2 className="w-3.5 h-3.5" />
          </Button>
        </div>
      </div>
    </div>
  )
}

// Empty State Component
function EmptyState({
  type,
  onAdd,
  onInitialize
}: {
  type: PolicyType
  onAdd: () => void
  onInitialize: () => void
}) {
  return (
    <div className="text-center py-8 border border-dashed border-[var(--chidi-border-subtle)] rounded-lg">
      {type === 'FAQ' ? (
        <HelpCircle className="w-10 h-10 mx-auto text-[var(--chidi-text-muted)] mb-3" />
      ) : (
        <ScrollText className="w-10 h-10 mx-auto text-[var(--chidi-text-muted)] mb-3" />
      )}
      <p className="text-sm text-[var(--chidi-text-muted)] mb-4">
        {type === 'FAQ'
          ? 'No FAQs yet. Add questions your AI can answer.'
          : 'No rules yet. Add policies your AI should follow.'}
      </p>
      <div className="flex justify-center gap-2">
        <Button variant="outline" size="sm" onClick={onInitialize}>
          Load Defaults
        </Button>
        <Button size="sm" onClick={onAdd}>
          <Plus className="w-4 h-4 mr-1" />
          Add {type === 'FAQ' ? 'FAQ' : 'Rule'}
        </Button>
      </div>
    </div>
  )
}

// Policy Form Component
function PolicyForm({
  formData,
  setFormData,
  onSave,
  onCancel,
  saving,
  isFaq
}: {
  formData: PolicyFormData
  setFormData: (data: PolicyFormData) => void
  onSave: () => void
  onCancel: () => void
  saving: boolean
  isFaq?: boolean
}) {
  return (
    <div className="space-y-4 pt-2">
      <div className="space-y-2">
        <Label htmlFor="title" className="text-sm">
          {isFaq ? 'Question' : 'Title'}
        </Label>
        <Input
          id="title"
          value={formData.title}
          onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          placeholder={isFaq ? 'e.g., What is your return policy?' : 'e.g., Delivery Times'}
          className="bg-white"
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="content" className="text-sm">
          {isFaq ? 'Answer' : 'Description'}
        </Label>
        <Textarea
          id="content"
          value={formData.content}
          onChange={(e) => setFormData({ ...formData, content: e.target.value })}
          placeholder={
            isFaq
              ? 'e.g., We offer a 7-day return policy for all items...'
              : 'e.g., Lagos delivery is 1-3 business days...'
          }
          rows={4}
          className="bg-white resize-none"
        />
      </div>

      <div className="flex justify-end gap-2 pt-2">
        <Button variant="outline" onClick={onCancel} disabled={saving}>
          Cancel
        </Button>
        <Button
          onClick={onSave}
          disabled={saving || !formData.title.trim() || !formData.content.trim()}
          className="bg-[var(--chidi-accent)] text-[var(--chidi-accent-foreground)]"
        >
          {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
          Save
        </Button>
      </div>
    </div>
  )
}
