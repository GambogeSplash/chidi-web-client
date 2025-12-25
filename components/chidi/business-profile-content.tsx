'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Building2, HelpCircle, BookOpen, Plus, Pencil, Trash2, Loader2, Save, X } from 'lucide-react'
import { authAPI, type User } from '@/lib/api'
import { knowledgeAPI, type BusinessKnowledge, type KnowledgeType } from '@/lib/api/knowledge'
import { businessAPI } from '@/lib/api/business'

interface BusinessProfileContentProps {
  businessSlug: string
}

interface KnowledgeFormData {
  type: KnowledgeType
  title: string
  content: string
}

export function BusinessProfileContent({ businessSlug }: BusinessProfileContentProps) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [activeTab, setActiveTab] = useState<'info' | 'faqs' | 'rules'>('info')
  
  // Knowledge state
  const [faqs, setFaqs] = useState<BusinessKnowledge[]>([])
  const [rules, setRules] = useState<BusinessKnowledge[]>([])
  const [loadingKnowledge, setLoadingKnowledge] = useState(false)
  
  // Modal state
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [editingItem, setEditingItem] = useState<BusinessKnowledge | null>(null)
  const [formData, setFormData] = useState<KnowledgeFormData>({ type: 'FAQ', title: '', content: '' })
  const [saving, setSaving] = useState(false)

  // Profile form state
  const [profileData, setProfileData] = useState({
    businessName: '',
    businessCategory: '',
    description: '',
    phone: '',
    whatsappNumber: '',
    instagram: '',
    website: '',
    addressLine1: '',
    city: '',
    country: '',
  })
  const [savingProfile, setSavingProfile] = useState(false)

  useEffect(() => {
    const loadData = async () => {
      try {
        if (!authAPI.isAuthenticated()) {
          router.push('/auth')
          return
        }

        const userData = await authAPI.getMe()
        console.log('📋 [BUSINESS-PROFILE] userData:', userData)
        console.log('📋 [BUSINESS-PROFILE] businessId:', userData.businessId)
        setUser(userData)

        // Populate profile form
        setProfileData({
          businessName: userData.businessName || '',
          businessCategory: userData.profile?.business_category || '',
          description: userData.profile?.description || '',
          phone: userData.profile?.phone || '',
          whatsappNumber: userData.profile?.whatsapp_number || '',
          instagram: userData.profile?.instagram || '',
          website: userData.profile?.website || '',
          addressLine1: userData.profile?.address_line1 || '',
          city: userData.profile?.city || '',
          country: userData.profile?.country || '',
        })

        // Load knowledge
        if (userData.businessId) {
          console.log('📋 [BUSINESS-PROFILE] Loading knowledge for businessId:', userData.businessId)
          await loadKnowledge(userData.businessId)
        } else {
          console.warn('⚠️ [BUSINESS-PROFILE] No businessId found, cannot load knowledge')
        }
      } catch (error) {
        console.error('Failed to load data:', error)
        router.push('/auth')
      } finally {
        setIsLoading(false)
      }
    }

    loadData()
  }, [router])

  const loadKnowledge = async (businessId: string) => {
    try {
      setLoadingKnowledge(true)
      console.log('📋 [BUSINESS-PROFILE] Fetching FAQs and Rules...')
      const [faqsData, rulesData] = await Promise.all([
        knowledgeAPI.getFAQs(businessId),
        knowledgeAPI.getRules(businessId)
      ])
      console.log('📋 [BUSINESS-PROFILE] FAQs:', faqsData)
      console.log('📋 [BUSINESS-PROFILE] Rules:', rulesData)
      
      // Auto-initialize defaults if both are empty (first visit)
      if (faqsData.length === 0 && rulesData.length === 0) {
        console.log('📋 [BUSINESS-PROFILE] Both empty, initializing defaults...')
        await knowledgeAPI.initializeDefaults(businessId)
        // Reload after initialization
        const [newFaqs, newRules] = await Promise.all([
          knowledgeAPI.getFAQs(businessId),
          knowledgeAPI.getRules(businessId)
        ])
        console.log('📋 [BUSINESS-PROFILE] After init - FAQs:', newFaqs)
        console.log('📋 [BUSINESS-PROFILE] After init - Rules:', newRules)
        setFaqs(newFaqs)
        setRules(newRules)
      } else {
        setFaqs(faqsData)
        setRules(rulesData)
      }
    } catch (error) {
      console.error('❌ [BUSINESS-PROFILE] Failed to load knowledge:', error)
    } finally {
      setLoadingKnowledge(false)
    }
  }

  const handleAddItem = () => {
    setFormData({
      type: activeTab === 'faqs' ? 'FAQ' : 'RULE',
      title: '',
      content: ''
    })
    setShowAddModal(true)
  }

  const handleEditItem = (item: BusinessKnowledge) => {
    setEditingItem(item)
    setFormData({
      type: item.type,
      title: item.title,
      content: item.content
    })
    setShowEditModal(true)
  }

  const handleDeleteItem = async (item: BusinessKnowledge) => {
    if (!user?.businessId || !confirm('Are you sure you want to delete this item?')) return

    try {
      await knowledgeAPI.delete(user.businessId, item.id)
      if (item.type === 'FAQ') {
        setFaqs(prev => prev.filter(f => f.id !== item.id))
      } else {
        setRules(prev => prev.filter(r => r.id !== item.id))
      }
    } catch (error) {
      console.error('Failed to delete item:', error)
    }
  }

  const handleSaveNew = async () => {
    if (!user?.businessId || !formData.title.trim() || !formData.content.trim()) return

    try {
      setSaving(true)
      const newItem = await knowledgeAPI.create(user.businessId, {
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
    } catch (error) {
      console.error('Failed to create item:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleSaveEdit = async () => {
    if (!user?.businessId || !editingItem || !formData.title.trim() || !formData.content.trim()) return

    try {
      setSaving(true)
      const updatedItem = await knowledgeAPI.update(user.businessId, editingItem.id, {
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
    } catch (error) {
      console.error('Failed to update item:', error)
    } finally {
      setSaving(false)
    }
  }

  const handleInitializeDefaults = async () => {
    if (!user?.businessId) return

    try {
      setLoadingKnowledge(true)
      await knowledgeAPI.initializeDefaults(user.businessId)
      await loadKnowledge(user.businessId)
    } catch (error) {
      console.error('Failed to initialize defaults:', error)
    } finally {
      setLoadingKnowledge(false)
    }
  }

  const handleSaveProfile = async () => {
    if (!user?.businessId) return

    try {
      setSavingProfile(true)
      await businessAPI.updateProfile(user.businessId, {
        legal_name: profileData.businessName,
        business_category: profileData.businessCategory,
        description: profileData.description,
        phone: profileData.phone,
        whatsapp_number: profileData.whatsappNumber,
        instagram: profileData.instagram,
        website: profileData.website,
        address_line1: profileData.addressLine1,
        city: profileData.city,
        country: profileData.country,
      })
      console.log('✅ Profile saved successfully')
    } catch (error) {
      console.error('Failed to save profile:', error)
    } finally {
      setSavingProfile(false)
    }
  }

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-8 h-8 text-indigo-500 animate-spin mx-auto mb-4" />
          <p className="text-gray-400">Loading business profile...</p>
        </div>
      </div>
    )
  }

  const tabs = [
    { id: 'info' as const, label: 'Basic Info', icon: Building2 },
    { id: 'faqs' as const, label: 'Customer Questions', icon: HelpCircle },
    { id: 'rules' as const, label: 'How We Work', icon: BookOpen },
  ]

  return (
    <div className="min-h-screen bg-gray-950">
      {/* Header */}
      <div className="border-b border-gray-800 bg-gray-900/50">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push(`/dashboard/${businessSlug}`)}
              className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
            >
              <ArrowLeft className="w-5 h-5 text-gray-400" />
            </button>
            <div>
              <h1 className="text-xl font-semibold text-white">Business Profile</h1>
              <p className="text-sm text-gray-400">Manage your business information and AI knowledge base</p>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-800">
        <div className="max-w-5xl mx-auto px-6">
          <div className="flex gap-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? 'border-indigo-500 text-indigo-400'
                    : 'border-transparent text-gray-400 hover:text-gray-300'
                }`}
              >
                <tab.icon className="w-4 h-4" />
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-5xl mx-auto px-6 py-8">
        {activeTab === 'info' && (
          <BasicInfoTab
            profileData={profileData}
            setProfileData={setProfileData}
            saving={savingProfile}
            onSave={handleSaveProfile}
          />
        )}

        {activeTab === 'faqs' && (
          <KnowledgeTab
            items={faqs}
            type="FAQ"
            loading={loadingKnowledge}
            onAdd={handleAddItem}
            onEdit={handleEditItem}
            onDelete={handleDeleteItem}
            onInitializeDefaults={handleInitializeDefaults}
            emptyTitle="No FAQs yet"
            emptyDescription="Add frequently asked questions to help the AI answer customer queries."
          />
        )}

        {activeTab === 'rules' && (
          <KnowledgeTab
            items={rules}
            type="RULE"
            loading={loadingKnowledge}
            onAdd={handleAddItem}
            onEdit={handleEditItem}
            onDelete={handleDeleteItem}
            onInitializeDefaults={handleInitializeDefaults}
            emptyTitle="No business rules yet"
            emptyDescription="Add your business rules and policies to help the AI provide accurate information."
          />
        )}
      </div>

      {/* Add Modal */}
      {showAddModal && (
        <KnowledgeModal
          title={formData.type === 'FAQ' ? 'Add FAQ' : 'Add Business Rule'}
          formData={formData}
          setFormData={setFormData}
          onSave={handleSaveNew}
          onClose={() => setShowAddModal(false)}
          saving={saving}
          isFaq={formData.type === 'FAQ'}
        />
      )}

      {/* Edit Modal */}
      {showEditModal && editingItem && (
        <KnowledgeModal
          title={editingItem.type === 'FAQ' ? 'Edit FAQ' : 'Edit Business Rule'}
          formData={formData}
          setFormData={setFormData}
          onSave={handleSaveEdit}
          onClose={() => {
            setShowEditModal(false)
            setEditingItem(null)
          }}
          saving={saving}
          isFaq={editingItem.type === 'FAQ'}
        />
      )}
    </div>
  )
}

// Business category options
const BUSINESS_CATEGORIES = [
  { id: "fashion", label: "Fashion & Clothing" },
  { id: "electronics", label: "Electronics" },
  { id: "beauty", label: "Beauty & Cosmetics" },
  { id: "food", label: "Food & Beverages" },
  { id: "home", label: "Home & Living" },
  { id: "health", label: "Health & Wellness" },
  { id: "services", label: "Services" },
  { id: "art", label: "Art & Crafts" },
  { id: "sports", label: "Sports & Fitness" },
  { id: "automotive", label: "Automotive" },
  { id: "education", label: "Education" },
  { id: "other", label: "Other" },
]

// Basic Info Tab Component
function BasicInfoTab({
  profileData,
  setProfileData,
  saving,
  onSave
}: {
  profileData: any
  setProfileData: (data: any) => void
  saving: boolean
  onSave: () => void
}) {
  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Business Name */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Business Name</label>
          <input
            type="text"
            value={profileData.businessName}
            onChange={(e) => setProfileData({ ...profileData, businessName: e.target.value })}
            className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="Your business name"
          />
        </div>

        {/* Business Category */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Business Category</label>
          <select
            value={profileData.businessCategory}
            onChange={(e) => setProfileData({ ...profileData, businessCategory: e.target.value })}
            className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          >
            <option value="">Select a category</option>
            {BUSINESS_CATEGORIES.map((category) => (
              <option key={category.id} value={category.id}>
                {category.label}
              </option>
            ))}
          </select>
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Phone Number</label>
          <input
            type="tel"
            value={profileData.phone}
            onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
            className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="+234..."
          />
        </div>

        {/* WhatsApp */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">WhatsApp Number</label>
          <input
            type="tel"
            value={profileData.whatsappNumber}
            onChange={(e) => setProfileData({ ...profileData, whatsappNumber: e.target.value })}
            className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="+234..."
          />
        </div>

        {/* Instagram */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Instagram Handle</label>
          <input
            type="text"
            value={profileData.instagram}
            onChange={(e) => setProfileData({ ...profileData, instagram: e.target.value })}
            className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="@yourbusiness"
          />
        </div>

        {/* Website */}
        <div>
          <label className="block text-sm font-medium text-gray-300 mb-2">Website</label>
          <input
            type="url"
            value={profileData.website}
            onChange={(e) => setProfileData({ ...profileData, website: e.target.value })}
            className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
            placeholder="https://..."
          />
        </div>
      </div>

      {/* Description */}
      <div>
        <label className="block text-sm font-medium text-gray-300 mb-2">Business Description</label>
        <textarea
          value={profileData.description}
          onChange={(e) => setProfileData({ ...profileData, description: e.target.value })}
          rows={3}
          className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
          placeholder="Tell customers about your business..."
        />
      </div>

      {/* Address */}
      <div className="space-y-4">
        <h3 className="text-sm font-medium text-gray-300">Address</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="md:col-span-3">
            <input
              type="text"
              value={profileData.addressLine1}
              onChange={(e) => setProfileData({ ...profileData, addressLine1: e.target.value })}
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Street address"
            />
          </div>
          <div>
            <input
              type="text"
              value={profileData.city}
              onChange={(e) => setProfileData({ ...profileData, city: e.target.value })}
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="City"
            />
          </div>
          <div>
            <input
              type="text"
              value={profileData.country}
              onChange={(e) => setProfileData({ ...profileData, country: e.target.value })}
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder="Country"
            />
          </div>
        </div>
      </div>

      {/* Save Button */}
      <div className="flex justify-end pt-4">
        <button
          onClick={onSave}
          disabled={saving}
          className="flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 text-white font-medium rounded-lg transition-colors"
        >
          {saving ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            <Save className="w-4 h-4" />
          )}
          Save Changes
        </button>
      </div>
    </div>
  )
}

// Knowledge Tab Component
function KnowledgeTab({
  items,
  type,
  loading,
  onAdd,
  onEdit,
  onDelete,
  onInitializeDefaults,
  emptyTitle,
  emptyDescription
}: {
  items: BusinessKnowledge[]
  type: KnowledgeType
  loading: boolean
  onAdd: () => void
  onEdit: (item: BusinessKnowledge) => void
  onDelete: (item: BusinessKnowledge) => void
  onInitializeDefaults: () => void
  emptyTitle: string
  emptyDescription: string
}) {
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="w-6 h-6 text-indigo-500 animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-medium text-white">
            {type === 'FAQ' ? 'Customer Questions (FAQs)' : 'How We Work (Business Rules)'}
          </h2>
          <p className="text-sm text-gray-400">
            {type === 'FAQ' 
              ? 'Common questions customers ask about your business'
              : 'Your business policies and operational rules'
            }
          </p>
        </div>
        <button
          onClick={onAdd}
          className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg transition-colors"
        >
          <Plus className="w-4 h-4" />
          Add {type === 'FAQ' ? 'FAQ' : 'Rule'}
        </button>
      </div>

      {/* Items List */}
      {items.length === 0 ? (
        <div className="text-center py-12 bg-gray-900/50 rounded-xl border border-gray-800">
          <div className="w-12 h-12 bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-4">
            {type === 'FAQ' ? (
              <HelpCircle className="w-6 h-6 text-gray-500" />
            ) : (
              <BookOpen className="w-6 h-6 text-gray-500" />
            )}
          </div>
          <h3 className="text-white font-medium mb-1">{emptyTitle}</h3>
          <p className="text-gray-400 text-sm mb-4">{emptyDescription}</p>
          <button
            onClick={onInitializeDefaults}
            className="text-indigo-400 hover:text-indigo-300 text-sm font-medium"
          >
            Load default templates
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {items.map(item => (
            <div
              key={item.id}
              className="bg-gray-900/50 border border-gray-800 rounded-xl p-4 hover:border-gray-700 transition-colors"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-medium mb-1">{item.title}</h3>
                  <p className="text-gray-400 text-sm">{item.content}</p>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onEdit(item)}
                    className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <Pencil className="w-4 h-4 text-gray-400" />
                  </button>
                  <button
                    onClick={() => onDelete(item)}
                    className="p-2 hover:bg-gray-800 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4 text-red-400" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// Knowledge Modal Component
function KnowledgeModal({
  title,
  formData,
  setFormData,
  onSave,
  onClose,
  saving,
  isFaq
}: {
  title: string
  formData: KnowledgeFormData
  setFormData: (data: KnowledgeFormData) => void
  onSave: () => void
  onClose: () => void
  saving: boolean
  isFaq: boolean
}) {
  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-900 rounded-xl border border-gray-800 w-full max-w-lg">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-800">
          <h2 className="text-lg font-semibold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="p-1 hover:bg-gray-800 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Form */}
        <div className="p-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {isFaq ? 'Question' : 'Title'}
            </label>
            <input
              type="text"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              placeholder={isFaq ? 'e.g., Do you deliver?' : 'e.g., Delivery Times'}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-300 mb-2">
              {isFaq ? 'Answer' : 'Description'}
            </label>
            <textarea
              value={formData.content}
              onChange={(e) => setFormData({ ...formData, content: e.target.value })}
              rows={4}
              className="w-full px-4 py-2.5 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              placeholder={isFaq 
                ? 'e.g., Yes! We deliver within Lagos in 1-3 business days.'
                : 'e.g., Lagos: 1-3 business days. Nationwide: 5-7 business days.'
              }
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-gray-800">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onSave}
            disabled={saving || !formData.title.trim() || !formData.content.trim()}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-800 disabled:cursor-not-allowed text-white font-medium rounded-lg transition-colors"
          >
            {saving && <Loader2 className="w-4 h-4 animate-spin" />}
            Save
          </button>
        </div>
      </div>
    </div>
  )
}
