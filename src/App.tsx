import { useEffect, useState } from 'react'
import { LocationAutocomplete } from './LocationAutocomplete'

type View = 'landing' | 'signin' | 'signup' | 'dashboard'
type Tab = 'bought' | 'sold'
type DashboardScreen = 'home' | 'search' | 'donations' | 'bought' | 'sold' | 'coins' | 'messages' | 'profile'
type FoundationApplicantType = 'referred-family' | 'playmore-family' | 'requesting-for-someone'
type FoundationApplicationStatus = 'pending' | 'approved' | 'denied'

interface FoundationApplication {
  applicantType: FoundationApplicantType
  beneficiaryName: string
  connection: string
  need: string
  status: FoundationApplicationStatus
  submittedAt: string
  requestedItemId?: number
  requestedItemName?: string
}

interface User {
  name: string
  email: string
  coins: number
  avatar: string
  location: string
  profileImage?: string
  foundationApplication?: FoundationApplication
}

interface Item {
  id: number
  name: string
  sport: string
  coins: number
  date: string
  image: string
  condition: string
  size: string
  gender: 'Men' | 'Women' | 'Unisex'
  seller?: string
  buyer?: string
}

interface MarketplaceItem {
  id: number
  name: string
  sport: string
  coinCost: number
  image: string
  size?: string
  gender?: 'Men' | 'Women' | 'Kids' | 'Unisex'
  color?: string
  condition?: string
  seller?: string
  description?: string
  cashEstimate?: number
  images?: string[]
  ownerEmail?: string
}

interface UserEquipmentListing extends MarketplaceItem {
  description: string
  cashEstimate: number
  images: string[]
  ownerEmail: string
  status: 'active' | 'completed'
}

interface DonorReview {
  id: number
  exchangeKey: string
  donor: string
  recipientEmail: string
  rating: number
  review: string
  itemName: string
  date: string
}

interface CoinTransaction {
  id: number
  amount: number
  itemName: string
  type: 'earned' | 'spent'
  date: string
  note: string
}

interface ImageViewerState {
  title: string
  images: string[]
  index: number
}

interface WishlistRequest {
  id: number
  author: string
  avatar: string
  item: string
  sport: string
  note: string
  posted: string
}

interface ChatMessage {
  id: number
  sender: 'me' | 'them'
  text: string
  time: string
}

interface Conversation {
  id: number
  name: string
  avatar: string
  sport: string
  online: boolean
}

interface DonationItem {
  estimatedCashValue?: number
  estimatedCoinValue?: number
  ownerCashValue?: number
  ownerCoinValue?: number
  id: number
  item: string
  sport: string
  condition: string
  location: string
  note: string
  donor: string
  avatar: string
  image: string
  images?: string[]
  claimedBy?: string
}

interface StoredAccount {
  user: User
  password: string
}

interface DashboardProgress {
  coinBalance: number
  purchasedItems: number[]
  wishlistRequests: WishlistRequest[]
  conversations: Conversation[]
  messages: Record<number, ChatMessage[]>
  selectedConversation: number
  donations: DonationItem[]
  markedSoldItemIds: number[]
  foundationRequestedItemIds: number[]
  pendingExchangeItemIds: number[]
  userEquipmentListings: UserEquipmentListing[]
  donorReviews: DonorReview[]
  coinTransactions: CoinTransaction[]
}

const ACCOUNTS_STORAGE_KEY = 'playmore-accounts'

function loadAccounts(): Record<string, StoredAccount> {
  try {
    return JSON.parse(localStorage.getItem(ACCOUNTS_STORAGE_KEY) ?? '{}')
  } catch {
    return {}
  }
}

function saveAccounts(accounts: Record<string, StoredAccount>) {
  localStorage.setItem(ACCOUNTS_STORAGE_KEY, JSON.stringify(accounts))
}

function progressStorageKey(email: string) {
  return `playmore-progress:${email.trim().toLowerCase()}`
}

function loadProgress(email: string): Partial<DashboardProgress> {
  try {
    return JSON.parse(localStorage.getItem(progressStorageKey(email)) ?? '{}')
  } catch {
    return {}
  }
}

function fileToDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsDataURL(file)
  })
}

function ProgressPersistence({ snapshot }: { snapshot: string }) {
  useEffect(() => {
    try {
      const { email, progress } = JSON.parse(snapshot) as {
        email: string
        progress: DashboardProgress
      }
      localStorage.setItem(progressStorageKey(email), JSON.stringify(progress))
    } catch {
      // Keep the current session usable if browser storage is unavailable or full.
    }
  }, [snapshot])

  return null
}

const MAX_DONATION_IMAGES = 6
const SEARCH_CATEGORIES = [
  'American Football',
  'Baseball',
  'Basketball',
  'Cycling',
  'Fitness',
  'Golf',
  'Soccer',
  'Tennis',
  'Training',
  'Other',
]
const EQUIPMENT_REQUEST_OPTIONS = [
  'Balls',
  'Bikes',
  'Clothing',
  'Footwear',
  'Protective gear',
  'Rackets and bats',
  'Training equipment',
  'Other',
]
const SAMPLE_DONOR_REVIEWS: DonorReview[] = [
  { id: 1, exchangeKey: 'sample-1', donor: 'Marcus J.', recipientEmail: 'sample1@playmore.org', rating: 5, review: 'The football was exactly as described and pickup was easy.', itemName: 'Pro Leather American Football', date: 'Sep 18, 2026' },
  { id: 2, exchangeKey: 'sample-2', donor: 'Marcus J.', recipientEmail: 'sample2@playmore.org', rating: 4, review: 'Reliable provider and great communication.', itemName: 'Training football', date: 'Aug 30, 2026' },
  { id: 3, exchangeKey: 'sample-3', donor: 'Sam K.', recipientEmail: 'sample3@playmore.org', rating: 5, review: 'Helmet was clean and ready to use.', itemName: 'Cycling helmet', date: 'Sep 4, 2026' },
  { id: 4, exchangeKey: 'sample-4', donor: 'Alex T.', recipientEmail: 'sample4@playmore.org', rating: 5, review: '', itemName: 'Training mat', date: 'Aug 22, 2026' },
]
const CASH_VALUE_BY_CATEGORY: Record<string, number> = {
  Ball: 25,
  Bicycle: 320,
  Clothing: 35,
  Footwear: 70,
  'Protective gear': 85,
  'Racket or bat': 95,
  'Training equipment': 55,
  Other: 45,
}

// Community points use the existing listing suggestion ratio, not a cash redemption rate.
const COINS_PER_DOLLAR = 3

function estimateEquipmentValue(category: string, condition: string, age = 0) {
  const factors: Record<string, number> = { 'Like New': 0.9, 'Very Good': 0.75, Good: 0.6, Fair: 0.4 }
  const cash = Math.max(5, Math.round((CASH_VALUE_BY_CATEGORY[category] ?? 45) * (factors[condition] ?? 0.6) * Math.max(0.55, 1 - Math.max(0, age) * 0.06)))
  return { cash, coins: Math.max(10, Math.round(cash * COINS_PER_DOLLAR)) }
}

function EquipmentValuation({ cash, coins, ownerValue, onOwnerValueChange }: {
  cash: number
  coins: number
  ownerValue: string | null
  onOwnerValueChange: (value: string | null) => void
}) {
  return (
    <section className="mt-4 rounded-2xl border border-[#c4b5fd] bg-[#faf5ff] p-4">
      <h3 className="font-display font-800 text-[#241335]">Estimated equipment value</h3>
      <div className="mt-3 grid grid-cols-2 gap-3" aria-live="polite">
        <div className="rounded-xl bg-white p-3"><div className="text-xs text-[#75647e]">App coins</div><div className="mt-1 text-xl font-800 text-[#7c3aed]">{coins.toLocaleString()} coins</div></div>
        <div className="rounded-xl bg-white p-3"><div className="text-xs text-[#75647e]">Real-world value</div><div className="mt-1 text-xl font-800 text-[#241335]">${cash.toFixed(2)} USD</div></div>
      </div>
      <p className="mt-3 text-[11px] leading-relaxed text-[#75647e]">Sample estimate based on equipment type and condition. Photos are not analyzed by AI. Each $1 of estimated value suggests 3 community coins; coins cannot be redeemed for cash.</p>
      <label className="mt-4 flex items-center gap-2 text-xs font-700 text-[#57445f]">
        <input type="checkbox" checked={ownerValue !== null} onChange={event => onOwnerValueChange(event.target.checked ? '' : null)} className="accent-[#7c3aed]" />
        Think this estimate is unreasonable? Suggest your own price.
      </label>
      {ownerValue !== null && (
        <div className="mt-3">
          <label className="block text-xs font-700 text-[#57445f]">Your estimated price (USD)
            <input type="number" min="0.01" max="1000000" step="0.01" required value={ownerValue} onChange={event => onOwnerValueChange(event.target.value)} placeholder="Enter your price" className="mt-2 block w-full rounded-xl border border-[#eadff0] bg-white px-3 py-3 text-sm text-[#241335]" />
          </label>
          <p className="mt-2 text-xs text-[#7c3aed]" aria-live="polite">{Number(ownerValue) > 0 ? `Your suggested value: ${Math.round(Number(ownerValue) * COINS_PER_DOLLAR).toLocaleString()} coins` : 'Enter a price to see its coin equivalent.'}</p>
          <p className="mt-1 text-[11px] text-[#75647e]">Your suggestion is saved separately from the app estimate. Donations remain free; this does not award coins.</p>
        </div>
      )}
    </section>
  )
}

const MOCK_USER: User = {
  name: 'Jordan Mercer',
  email: 'jordan@gearup.co',
  coins: 1240,
  avatar: 'JM',
  location: 'North Park',
}

const BOUGHT_ITEMS: Item[] = [
  {
    id: 1,
    name: 'Wilson Pro Staff RF97 Racket',
    sport: 'Tennis',
    coins: 189,
    date: 'Sep 28, 2026',
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&h=200&fit=crop&auto=format',
    condition: 'Like New',
    size: 'L',
    gender: 'Unisex',
    seller: 'Alex T.',
  },
  {
    id: 2,
    name: 'Specialized Allez Sprint Road Bike',
    sport: 'Cycling',
    coins: 1450,
    date: 'Sep 12, 2026',
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=300&h=200&fit=crop&auto=format',
    condition: 'Good',
    size: 'M',
    gender: 'Men',
    seller: 'Sam K.',
  },
  {
    id: 3,
    name: 'Bauer Supreme Hockey Skates',
    sport: 'Hockey',
    coins: 310,
    date: 'Aug 30, 2026',
    image: 'https://images.unsplash.com/photo-1515703407324-5f753afd8be8?w=300&h=200&fit=crop&auto=format',
    condition: 'Good',
    size: 'L',
    gender: 'Men',
    seller: 'Priya M.',
  },
  {
    id: 4,
    name: 'Titleist Pro V1 Golf Set',
    sport: 'Golf',
    coins: 220,
    date: 'Aug 14, 2026',
    image: 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=300&h=200&fit=crop&auto=format',
    condition: 'Like New',
    size: 'M',
    gender: 'Unisex',
    seller: 'Chris W.',
  },
]

const SOLD_ITEMS: Item[] = [
  {
    id: 5,
    name: 'Rossignol Experience 88 Skis',
    sport: 'Skiing',
    coins: 594,
    date: 'Sep 20, 2026',
    image: 'https://images.unsplash.com/photo-1551698618-1dfe5d97d256?w=300&h=200&fit=crop&auto=format',
    condition: 'Good',
    size: 'L',
    gender: 'Unisex',
    buyer: 'Mia L.',
  },
  {
    id: 6,
    name: 'Yonex Astrox 88D Badminton Racket',
    sport: 'Badminton',
    coins: 148,
    date: 'Aug 22, 2026',
    image: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=300&h=200&fit=crop&auto=format',
    condition: 'Like New',
    size: 'S',
    gender: 'Women',
    buyer: 'Tom R.',
  },
  {
    id: 7,
    name: 'Nike Mercurial Vapor Cleats',
    sport: 'Soccer',
    coins: 198,
    date: 'Jul 31, 2026',
    image: 'https://images.unsplash.com/photo-1542291026-7eec264c27ff?w=300&h=200&fit=crop&auto=format',
    condition: 'Very Good',
    size: 'M',
    gender: 'Men',
    buyer: 'Layla H.',
  },
]

const MARKETPLACE_ITEMS: MarketplaceItem[] = [
  {
    id: 108,
    name: 'Pro Leather American Football',
    sport: 'American Football',
    coinCost: 260,
    image: 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=500&h=400&fit=crop&auto=format',
    size: 'M',
    gender: 'Unisex',
    color: 'White',
    condition: 'Like New',
    seller: 'Marcus J.',
  },
  {
    id: 109,
    name: 'Junior Grip American Football',
    sport: 'American Football',
    coinCost: 190,
    image: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=500&h=400&fit=crop&auto=format',
    size: 'S',
    gender: 'Unisex',
    color: 'Blue',
    condition: 'Good',
    seller: 'Theo R.',
  },
  {
    id: 110,
    name: 'Elite Game American Football',
    sport: 'American Football',
    coinCost: 420,
    image: 'https://images.unsplash.com/photo-1570498839593-e565b39455fc?w=500&h=400&fit=crop&auto=format',
    size: 'L',
    gender: 'Unisex',
    color: 'White',
    condition: 'Very Good',
    seller: 'Dani P.',
  },
  {
    id: 111,
    name: 'Youth Training American Football',
    sport: 'American Football',
    coinCost: 220,
    image: 'https://images.unsplash.com/photo-1517466787929-bc90951d0974?w=500&h=400&fit=crop&auto=format',
    size: 'M',
    gender: 'Kids',
    color: 'Orange',
    condition: 'Good',
    seller: 'Jamie L.',
  },
  {
    id: 112,
    name: 'All-Weather American Football',
    sport: 'American Football',
    coinCost: 340,
    image: 'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?w=500&h=400&fit=crop&auto=format',
    size: 'L',
    gender: 'Unisex',
    color: 'Black',
    condition: 'Like New',
    seller: 'Avery S.',
  },
  {
    id: 100,
    name: 'GearUp Sports Bottle',
    sport: 'Training',
    coinCost: 120,
    image: 'https://images.unsplash.com/photo-1602143407151-7111542de6e8?w=500&h=400&fit=crop&auto=format',
    condition: 'Very Good',
    seller: 'Riley N.',
  },
  {
    id: 101,
    name: 'Adidas Training Soccer Ball',
    sport: 'Soccer',
    coinCost: 320,
    image: 'https://images.unsplash.com/photo-1553778263-73a83bab9b0c?w=500&h=400&fit=crop&auto=format',
    condition: 'Like New',
    seller: 'Morgan C.',
  },
  {
    id: 102,
    name: 'Wilson Championship Tennis Set',
    sport: 'Tennis',
    coinCost: 460,
    image: 'https://images.unsplash.com/photo-1698612922296-b4cd84d3a75c?w=500&h=400&fit=crop&auto=format',
    condition: 'Very Good',
    seller: 'Taylor B.',
  },
  {
    id: 103,
    name: 'Street Pro Basketball',
    sport: 'Basketball',
    coinCost: 280,
    image: 'https://images.unsplash.com/photo-1552492626-a714155fb6f3?w=500&h=400&fit=crop&auto=format',
    condition: 'Good',
    seller: 'Chris A.',
  },
  {
    id: 104,
    name: 'Performance Cycling Helmet',
    sport: 'Cycling',
    coinCost: 680,
    image: 'https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=500&h=400&fit=crop&auto=format',
    condition: 'Very Good',
    seller: 'Sam K.',
  },
  {
    id: 105,
    name: 'Speed Jump Rope',
    sport: 'Training',
    coinCost: 180,
    image: 'https://images.unsplash.com/photo-1599058917212-d750089bc07e?w=500&h=400&fit=crop&auto=format',
    condition: 'Good',
    seller: 'Nia W.',
  },
  {
    id: 106,
    name: 'Performance Training Mat',
    sport: 'Fitness',
    coinCost: 240,
    image: 'https://images.unsplash.com/photo-1592432678016-e910b452f9a2?w=500&h=400&fit=crop&auto=format',
    condition: 'Like New',
    seller: 'Alex T.',
  },
  {
    id: 107,
    name: 'Premium Golf Glove',
    sport: 'Golf',
    coinCost: 150,
    image: 'https://images.unsplash.com/photo-1535131749006-b7f58c99034b?w=500&h=400&fit=crop&auto=format',
    condition: 'Very Good',
    seller: 'Priya M.',
  },
]

const INITIAL_WISHLIST: WishlistRequest[] = [
  {
    id: 1,
    author: 'Maya Chen',
    avatar: 'MC',
    item: 'Women’s road cycling shoes, size 7',
    sport: 'Cycling',
    note: 'Looking for a lightly used pair with three-bolt cleat compatibility.',
    posted: '12 min ago',
  },
  {
    id: 2,
    author: 'Eli Thompson',
    avatar: 'ET',
    item: 'Left-handed baseball glove',
    sport: 'Baseball',
    note: 'Youth size preferred. Open to any trusted brand.',
    posted: '1 hr ago',
  },
  {
    id: 3,
    author: 'Nora Williams',
    avatar: 'NW',
    item: 'Beginner tennis racket',
    sport: 'Tennis',
    note: 'Need something lightweight for weekend lessons.',
    posted: '3 hrs ago',
  },
]

const CONVERSATIONS: Conversation[] = [
  { id: 1, name: 'Maya Chen', avatar: 'MC', sport: 'Cycling', online: true },
  { id: 2, name: 'Alex Thompson', avatar: 'AT', sport: 'Tennis', online: true },
  { id: 3, name: 'Priya Malik', avatar: 'PM', sport: 'Hockey', online: false },
]

const INITIAL_MESSAGES: Record<number, ChatMessage[]> = {
  1: [
    { id: 1, sender: 'them', text: 'Hi Jordan! Is the cycling helmet still available?', time: '10:24 AM' },
    { id: 2, sender: 'me', text: 'It is! I can set it aside for you.', time: '10:27 AM' },
    { id: 3, sender: 'them', text: 'Amazing, thank you. I’m getting back into weekend rides.', time: '10:29 AM' },
    { id: 4, sender: 'me', text: 'You should join our Saturday group ride once you’re set up.', time: '10:31 AM' },
  ],
  2: [
    { id: 5, sender: 'them', text: 'Thanks again for the racket. Want to hit sometime?', time: 'Yesterday' },
    { id: 6, sender: 'me', text: 'Definitely. I’m free Sunday morning!', time: 'Yesterday' },
  ],
  3: [
    { id: 7, sender: 'me', text: 'The skates arrived and fit perfectly. Thanks Priya!', time: 'Mon' },
    { id: 8, sender: 'them', text: 'Glad they found a good home. Have a great season!', time: 'Mon' },
  ],
}

const INITIAL_DONATIONS: DonationItem[] = [
  {
    id: 1,
    item: 'Set of junior tennis rackets',
    sport: 'Tennis',
    condition: 'Good',
    location: 'Riverside Community Center · 1.2 mi',
    note: 'Four rackets ready for a school team or young players getting started.',
    donor: 'Maya Chen',
    avatar: 'MC',
    image: 'https://images.unsplash.com/photo-1739134472056-8164f74227d8?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx1c2VkJTIwc3BvcnRzJTIwZXF1aXBtZW50JTIwZm9vdGJhbGwlMjB0ZW5uaXMlMjBiYXNrZXRiYWxsJTIwZG9uYXRpb258ZW58MXx8fHwxNzkxNzY4MTMyfDA&ixlib=rb-4.1.0&q=80&w=1080',
  },
  {
    id: 2,
    item: 'Youth basketballs',
    sport: 'Basketball',
    condition: 'Very Good',
    location: 'Eastside Sports Hub · 2.8 mi',
    note: 'A set of practice balls with plenty of games left in them.',
    donor: 'Alex Thompson',
    avatar: 'AT',
    image: 'https://images.unsplash.com/photo-1703673916845-a503ca0c9492?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHw2fHx1c2VkJTIwc3BvcnRzJTIwZXF1aXBtZW50JTIwZm9vdGJhbGwlMjB0ZW5uaXMlMjBiYXNrZXRiYWxsJTIwZG9uYXRpb258ZW58MXx8fHwxNzkxNzY4MTMyfDA&ixlib=rb-4.1.0&q=80&w=1080',
  },
  {
    id: 3,
    item: 'Mixed training balls',
    sport: 'Training',
    condition: 'Good',
    location: 'North Park Field House · 4.1 mi',
    note: 'Ideal for a community club, camp, or after-school program.',
    donor: 'Priya Malik',
    avatar: 'PM',
    image: 'https://images.unsplash.com/photo-1646504632442-6cacb1858bd6?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwyfHx1c2VkJTIwc3BvcnRzJTIwZXF1aXBtZW50JTIwZm9vdGJhbGwlMjB0ZW5uaXMlMjBiYXNrZXRiYWxsJTIwZG9uYXRpb258ZW58MXx8fHwxNzkxNzY4MTMyfDA&ixlib=rb-4.1.0&q=80&w=1080',
  },
]

const CONDITION_COLOR: Record<string, string> = {
  'Like New': 'text-[#8b5cf6]',
  'Very Good': 'text-sky-400',
  'Good': 'text-amber-400',
  'Fair': 'text-orange-400',
}

const SELLER_MEETUP_LOCATIONS: Record<string, string> = {
  'Alex T.': 'North Park',
  'Sam K.': 'Riverside',
  'Priya M.': 'Westside',
  'Chris W.': 'Downtown',
  'Marcus J.': 'North Park',
  'Theo R.': 'East Village',
  'Dani P.': 'Riverside',
  'Jamie L.': 'Westside',
  'Avery S.': 'Downtown',
  'Riley N.': 'North Park',
  'Morgan C.': 'East Village',
  'Taylor B.': 'Westside',
  'Chris A.': 'Downtown',
  'Nia W.': 'Riverside',
}

function getSellerMeetupLocation(seller?: string) {
  return seller ? SELLER_MEETUP_LOCATIONS[seller] ?? 'Central community area' : 'Meetup area shared in chat'
}

export default function App() {
  const [view, setView] = useState<View>('landing')
  const [tab, setTab] = useState<Tab>('bought')
  const [user, setUser] = useState<User>(MOCK_USER)
  const [formData, setFormData] = useState({ name: '', email: '', password: '', location: '' })
  const [authError, setAuthError] = useState('')

  useEffect(() => {
    if (view !== 'dashboard') return
    const accounts = loadAccounts()
    const emailKey = user.email.trim().toLowerCase()
    const account = accounts[emailKey]
    if (!account) return
    saveAccounts({ ...accounts, [emailKey]: { ...account, user } })
  }, [user, view])

  const handleAuth = (e: React.FormEvent) => {
    e.preventDefault()
    const email = formData.email.trim()
    const emailKey = email.toLowerCase()
    const accounts = loadAccounts()

    if (view === 'signin') {
      const account = accounts[emailKey]
      if (!account || account.password !== formData.password) {
        setAuthError('We could not find an account with that email and password.')
        return
      }
      setUser({
        ...account.user,
        location: account.user.location || 'Meetup area not set',
      })
      setAuthError('')
      setView('dashboard')
      return
    }

    if (accounts[emailKey]) {
      setAuthError('An account with this email already exists. Sign in instead.')
      return
    }

    const emailName = email
      .split('@')[0]
      .replace(/[._-]+/g, ' ')
      .replace(/\b\w/g, letter => letter.toUpperCase())
    const name = formData.name.trim() || emailName || 'GearUp Athlete'
    const avatar = name
      .split(/\s+/)
      .slice(0, 2)
      .map(part => part[0]?.toUpperCase())
      .join('')

    const newUser: User = {
      ...MOCK_USER,
      name,
      email,
      avatar: avatar || 'PA',
      location: formData.location.trim(),
    }
    saveAccounts({
      ...accounts,
      [emailKey]: { user: newUser, password: formData.password },
    })
    setUser(newUser)
    setAuthError('')
    setView('dashboard')
  }

  if (view === 'landing') {
    return <Landing onSignIn={() => setView('signin')} onSignUp={() => setView('signup')} />
  }

  if (view === 'signin' || view === 'signup') {
    return (
      <AuthPage
        mode={view}
        formData={formData}
        onChange={data => {
          setFormData(data)
          setAuthError('')
        }}
        onSubmit={handleAuth}
        authError={authError}
        onSwitch={() => {
          setAuthError('')
          setView(view === 'signin' ? 'signup' : 'signin')
        }}
        onBack={() => setView('landing')}
      />
    )
  }

  return (
    <Dashboard
      key={`dashboard-persistence-v2-${user.email}`}
      user={user}
      tab={tab}
      onTabChange={setTab}
      onUpdateName={name => {
        const avatar = name
          .split(/\s+/)
          .slice(0, 2)
          .map(part => part[0]?.toUpperCase())
          .join('')
        setUser(currentUser => ({ ...currentUser, name, avatar: avatar || currentUser.avatar }))
      }}
      onUpdateProfileImage={profileImage => setUser(currentUser => ({ ...currentUser, profileImage }))}
      onUpdateLocation={location => setUser(currentUser => ({ ...currentUser, location }))}
      onUpdateFoundationApplication={foundationApplication => setUser(currentUser => ({ ...currentUser, foundationApplication }))}
      onSignOut={() => setView('landing')}
    />
  )
}

function PlaymoreLogo({ size = 'md' }: { size?: 'sm' | 'md' | 'lg' }) {
  const textSize = size === 'lg' ? 'text-5xl' : size === 'md' ? 'text-2xl' : 'text-xl'
  const iconSize = size === 'lg' ? 'w-16 h-16' : size === 'md' ? 'w-10 h-10' : 'w-8 h-8'

  return (
    <div className="flex items-center gap-2.5" aria-label="GearUp">
      <div className={`${iconSize} flex-shrink-0`}>
        <svg viewBox="0 0 64 64" fill="none" className="w-full h-full" aria-hidden="true">
          <defs>
            <linearGradient id="playmore-logo-gradient" x1="13" y1="5" x2="53" y2="58" gradientUnits="userSpaceOnUse">
              <stop stopColor="#fbbf24" />
              <stop offset="0.42" stopColor="#f43f8f" />
              <stop offset="0.7" stopColor="#8b5cf6" />
              <stop offset="1" stopColor="#0ea5e9" />
            </linearGradient>
            <linearGradient id="playmore-orbit-gradient" x1="4" y1="44" x2="61" y2="27" gradientUnits="userSpaceOnUse">
              <stop stopColor="#f59e0b" />
              <stop offset="0.5" stopColor="#ec4899" />
              <stop offset="1" stopColor="#06b6d4" />
            </linearGradient>
          </defs>
          <text
            x="9"
            y="52"
            fill="url(#playmore-logo-gradient)"
            fontFamily="Outfit, sans-serif"
            fontSize="58"
            fontWeight="900"
            letterSpacing="-3"
          >
            G
          </text>
          <path d="M6 40.5c8.5 8 27.5 12.3 47.5 3.4 3.2-1.4 5.5-3 7.5-4.8" stroke="url(#playmore-orbit-gradient)" strokeWidth="4.5" strokeLinecap="round" />
          <circle cx="8.5" cy="39.5" r="4" fill="#f59e0b" />
        </svg>
      </div>
      <span className={`font-display font-900 ${textSize} tracking-[-0.055em] leading-none text-[#241335]`}>
        Ge<span className="text-[#f59e0b]">a</span><span className="text-[#ec4899]">r</span><span className="text-[#7c3aed]">U</span><span className="text-[#0ea5e9]">p</span>
      </span>
    </div>
  )
}

function Landing({ onSignIn, onSignUp }: { onSignIn: () => void; onSignUp: () => void }) {
  return (
    <div className="theme-page-background min-h-screen flex flex-col relative overflow-hidden">
      {/* Background texture */}
      <div className="absolute inset-0 opacity-[0.03]" style={{
        backgroundImage: `radial-gradient(circle at 1px 1px, #241335 1px, transparent 0)`,
        backgroundSize: '32px 32px',
      }} />

      {/* Glow orb */}
      <div className="absolute top-[-20%] left-[50%] -translate-x-1/2 w-[700px] h-[500px] rounded-full opacity-[0.07]"
        style={{ background: 'radial-gradient(ellipse, #8b5cf6 0%, transparent 70%)' }} />

      {/* Header */}
      <header className="relative z-10 px-4 pt-5 sm:px-8 sm:pt-8 flex items-center justify-between max-w-7xl mx-auto w-full">
        <PlaymoreLogo size="md" />
        <button
          onClick={onSignIn}
          className="text-sm font-medium text-[#75647e] hover:text-[#241335] transition-colors"
        >
          Sign in
        </button>
      </header>

      {/* Hero */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-4 py-12 sm:px-6 sm:py-16 text-center">
        <div className="inline-flex items-center gap-2 bg-[#f8f0fa] border border-[#eadff0] rounded-full px-4 py-2 mb-7 sm:mb-10">
          <span className="w-2 h-2 rounded-full brand-gradient animate-pulse" />
          <span className="text-xs font-medium text-[#75647e] tracking-wide uppercase">Trade. Earn. Play.</span>
        </div>

        <h1 className="font-display font-900 text-5xl sm:text-6xl md:text-8xl text-[#241335] leading-[0.95] tracking-tight mb-6 max-w-3xl">
          Your gear,<br />
          <span className="brand-text-gradient">rewarded.</span>
        </h1>

        <p className="text-[#75647e] text-base sm:text-lg max-w-md mb-9 sm:mb-12 leading-relaxed">
          Buy and sell sports equipment with other athletes. Every transaction earns you coins to spend on your next gear upgrade.
        </p>

        <div className="flex w-full max-w-sm flex-col sm:w-auto sm:max-w-none sm:flex-row gap-3 sm:gap-4 items-stretch sm:items-center">
          <button
            onClick={onSignUp}
            className="px-8 py-4 brand-gradient text-white font-display font-700 text-base rounded-xl hover:brightness-110 transition-all hover:scale-[1.02] active:scale-[0.98] shadow-lg shadow-[#8b5cf6]/20"
          >
            Get started — it's free
          </button>
          <button
            onClick={onSignIn}
            className="px-8 py-4 bg-[#f8f0fa] text-[#241335] font-display font-600 text-base rounded-xl border border-[#eadff0] hover:border-[#d8c8de] hover:bg-[#eadff0] transition-all"
          >
            Sign in
          </button>
        </div>

        {/* Stats row */}
        <div className="mt-14 grid w-full max-w-md grid-cols-3 gap-3 sm:mt-20 sm:flex sm:max-w-none sm:gap-16 sm:items-center">
          {[
            { value: '12,400+', label: 'Items traded' },
            { value: '3,800+', label: 'Active athletes' },
            { value: '18 sports', label: 'Categories' },
          ].map(({ value, label }) => (
            <div key={label} className="text-center">
              <div className="font-display font-800 text-lg sm:text-2xl text-[#241335]">{value}</div>
              <div className="text-[9px] sm:text-xs text-[#75647e] mt-1 tracking-wide uppercase">{label}</div>
            </div>
          ))}
        </div>
      </main>

      {/* Bottom strip */}
      <div className="relative z-10 border-t border-[#eadff0] px-4 sm:px-8 py-5 flex items-center justify-center text-center">
        <p className="text-[10px] sm:text-xs text-[#75647e]">© 2026 GearUp. The sports equipment exchange.</p>
      </div>
    </div>
  )
}

interface AuthFormData {
  name: string
  email: string
  password: string
  location: string
}

const STRONG_PASSWORD_PATTERN = /^(?=.*[A-Za-z])(?=.*\d)(?=.*[^A-Za-z0-9\s])\S{8,}$/

function CoinIcon({ className }: { className: string }) {
  return (
    <svg viewBox="0 0 40 40" className={`${className} flex-shrink-0 drop-shadow-lg`} aria-hidden="true">
      <defs>
        <linearGradient id="coin-gradient" x1="7" y1="5" x2="33" y2="35" gradientUnits="userSpaceOnUse">
          <stop stopColor="#fbbf24" />
          <stop offset="0.42" stopColor="#ec4899" />
          <stop offset="0.72" stopColor="#7c3aed" />
          <stop offset="1" stopColor="#0ea5e9" />
        </linearGradient>
      </defs>
      <circle cx="20" cy="20" r="18" fill="url(#coin-gradient)" />
      <circle cx="20" cy="20" r="14" fill="none" stroke="#f3e8ff" strokeOpacity="0.65" strokeWidth="1.5" />
      <path d="m20 10 2.7 5.6 6.2.9-4.5 4.4 1.1 6.1-5.5-2.9-5.5 2.9 1.1-6.1-4.5-4.4 6.2-.9L20 10Z" fill="#faf5ff" />
      <path d="M12 8.5c4.4-4 11.2-4.5 16.2-.8" fill="none" stroke="white" strokeOpacity="0.55" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  )
}

function AuthPage({
  mode, formData, onChange, onSubmit, authError, onSwitch, onBack,
}: {
  mode: 'signin' | 'signup'
  formData: AuthFormData
  onChange: (d: AuthFormData) => void
  onSubmit: (e: React.FormEvent) => void
  authError: string
  onSwitch: () => void
  onBack: () => void
}) {
  const isSignUp = mode === 'signup'
  const [passwordTouched, setPasswordTouched] = useState(false)
  const passwordIsValid = STRONG_PASSWORD_PATTERN.test(formData.password)
  const showPasswordError = isSignUp && passwordTouched && !passwordIsValid

  return (
    <div className="theme-page-background min-h-screen flex flex-col items-center justify-center px-4 py-16 sm:px-6 sm:py-24 relative overflow-hidden">
      <div className="absolute top-[-30%] right-[-10%] w-[500px] h-[500px] rounded-full opacity-[0.05]"
        style={{ background: 'radial-gradient(ellipse, #8b5cf6 0%, transparent 70%)' }} />

      <button
        onClick={onBack}
        className="absolute top-5 left-4 sm:top-8 sm:left-8 flex items-center gap-2 text-sm text-[#75647e] hover:text-[#241335] transition-colors"
      >
        <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4">
          <path d="M10 13L5 8l5-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Back
      </button>

      <div className="w-full max-w-5xl">
        <div className="mb-8 flex justify-center lg:justify-start">
          <PlaymoreLogo size="md" />
        </div>

        <div className="grid lg:grid-cols-[1.1fr_0.9fr] bg-[#ffffff] border border-[#eadff0] rounded-3xl lg:overflow-hidden shadow-xl shadow-slate-200/40">
          <section className="relative hidden bg-gradient-to-br from-[#241335] via-[#5b217a] to-[#0e7490] p-8 sm:p-10 text-white overflow-hidden lg:block">
            <div className="absolute -right-16 -top-16 w-56 h-56 rounded-full bg-[#ec4899]/20 blur-3xl" />
            <div className="relative">
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 border border-white/15 px-3 py-1.5 text-[10px] uppercase tracking-[0.16em] text-[#e9d5ff]">
              <span className="w-1.5 h-1.5 rounded-full bg-[#60a5fa]" />
              The coin-powered sports community
            </span>
            <h1 className="font-display font-900 text-4xl sm:text-5xl leading-[0.95] mt-6">No cash.<br />Just more <span className="text-[#60a5fa]">game.</span></h1>
            <p className="text-sm leading-relaxed text-[#dfd2e4] mt-5 max-w-md">GearUp turns the gear you no longer use into coins, new equipment, and real connections with athletes around you.</p>

            <div className="grid sm:grid-cols-2 lg:grid-cols-1 gap-3 mt-8">
              <div className="rounded-2xl bg-white/8 border border-white/10 p-4 flex gap-4">
                <CoinIcon className="w-10 h-10" />
                <div>
                  <div className="font-display font-700 text-sm">Coins only. No real money.</div>
                  <p className="text-xs leading-relaxed text-[#a28da9] mt-1">Sell equipment to earn coins, then use them for every purchase. No cards or cash prices.</p>
                </div>
              </div>
              <div className="rounded-2xl bg-white/8 border border-white/10 p-4 flex gap-4">
                <div className="w-10 h-10 rounded-full brand-gradient flex items-center justify-center flex-none">
                  <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5">
                    <path d="M7 11.5a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7Zm10 0a3.5 3.5 0 1 0 0-7 3.5 3.5 0 0 0 0 7ZM1.5 20c.4-3.8 2.2-5.7 5.5-5.7s5.1 1.9 5.5 5.7m-1-3.6c1-.9 2.4-1.4 4.5-1.4 3.3 0 5.1 1.7 5.5 5" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                  </svg>
                </div>
                <div>
                  <div className="font-display font-700 text-sm">Trade gear. Find your people.</div>
                  <p className="text-xs leading-relaxed text-[#a28da9] mt-1">Message nearby athletes, share advice, and turn an exchange into your next practice or game.</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-5">
              {[
                { number: '01', title: 'Pass gear on' },
                { number: '02', title: 'Earn coins' },
                { number: '03', title: 'Play together' },
              ].map(step => (
                <div key={step.number} className="rounded-xl border border-white/10 bg-black/10 p-3">
                  <div className="text-[9px] font-700 text-[#60a5fa]">{step.number}</div>
                  <div className="text-[10px] sm:text-xs font-600 text-white mt-1">{step.title}</div>
                </div>
              ))}
            </div>

            <div className="mt-5 rounded-2xl bg-white text-[#241335] p-4 shadow-xl shadow-black/10">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {['MC', 'AT', 'PM'].map(initials => (
                    <span key={initials} className="w-7 h-7 rounded-full bg-[#f3e8ff] border-2 border-white flex items-center justify-center text-[8px] font-800 text-[#7c3aed]">{initials}</span>
                  ))}
                </div>
                <span className="text-[10px] text-[#75647e]">3,800+ athletes trading and playing</span>
              </div>
              <p className="text-xs leading-relaxed mt-3">“I came for a used racket and found a Sunday tennis partner.”</p>
              <div className="text-[9px] font-700 text-[#8b5cf6] mt-2">Maya · GearUp member</div>
            </div>
            </div>
          </section>

          <div className="p-5 sm:p-10">
          <div className="inline-flex items-center gap-2 rounded-full bg-[#faf5ff] px-3 py-1.5 mb-5">
            <CoinIcon className="w-5 h-5" />
            <span className="text-[10px] font-700 text-[#7c3aed]">100% coins · 0% real money</span>
          </div>
          <h2 className="font-display font-800 text-2xl text-[#241335] mb-1">
            {isSignUp ? 'Create account' : 'Welcome back'}
          </h2>
          <p className="text-sm text-[#75647e] mb-8">
            {isSignUp ? 'Join athletes sharing gear, coins, and good games.' : 'Your gear, coins, and community are waiting.'}
          </p>

          <form
            onSubmit={event => {
              if (isSignUp && !passwordIsValid) {
                event.preventDefault()
                setPasswordTouched(true)
                return
              }
              onSubmit(event)
            }}
            className="space-y-4"
          >
            {isSignUp && (
              <div>
                <label className="block text-xs font-medium text-[#75647e] mb-2 uppercase tracking-wide">Full name</label>
                <input
                  type="text"
                  required
                  placeholder="Jordan Mercer"
                  value={formData.name}
                  onChange={e => onChange({ ...formData, name: e.target.value })}
                  className="w-full bg-[#fffdf9] border border-[#eadff0] rounded-xl px-4 py-3 text-[#241335] text-sm placeholder-[#d8c8de] focus:outline-none focus:border-[#8b5cf6] transition-colors"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-[#75647e] mb-2 uppercase tracking-wide">Email</label>
              <input
                type="email"
                required
                placeholder="you@example.com"
                value={formData.email}
                onChange={e => onChange({ ...formData, email: e.target.value })}
                className="w-full bg-[#fffdf9] border border-[#eadff0] rounded-xl px-4 py-3 text-[#241335] text-sm placeholder-[#d8c8de] focus:outline-none focus:border-[#8b5cf6] transition-colors"
              />
            </div>
            {isSignUp && (
              <div>
                <label className="block text-xs font-medium text-[#75647e] mb-2 uppercase tracking-wide">Your meetup area</label>
                <LocationAutocomplete
                  value={formData.location}
                  onChange={location => onChange({ ...formData, location })}
                  inputClassName="w-full bg-[#fffdf9] border border-[#eadff0] rounded-xl py-3 pl-11 pr-10 text-[#241335] text-sm placeholder-[#a28da9] focus:outline-none focus:border-[#8b5cf6] transition-colors"
                />
                <p className="mt-2 text-xs leading-relaxed text-[#75647e]">Share a general area only—not your exact address. Buyers use this to plan a safe public meetup.</p>
              </div>
            )}
            <div>
              <label className="block text-xs font-medium text-[#75647e] mb-2 uppercase tracking-wide">Password</label>
              <input
                type="password"
                required
                placeholder="••••••••"
                value={formData.password}
                onChange={e => onChange({ ...formData, password: e.target.value })}
                onBlur={() => {
                  if (isSignUp) setPasswordTouched(true)
                }}
                minLength={isSignUp ? 8 : undefined}
                autoComplete={isSignUp ? 'new-password' : 'current-password'}
                aria-describedby={isSignUp ? 'password-requirements' : undefined}
                aria-invalid={showPasswordError}
                className={`w-full bg-[#fffdf9] border rounded-xl px-4 py-3 text-[#241335] text-sm placeholder-[#d8c8de] focus:outline-none transition-colors ${
                  showPasswordError
                    ? 'border-red-400 focus:border-red-500'
                    : 'border-[#eadff0] focus:border-[#8b5cf6]'
                }`}
              />
              {isSignUp && (
                <p
                  id="password-requirements"
                  className={`mt-2 text-xs leading-relaxed ${showPasswordError ? 'text-red-600' : 'text-[#75647e]'}`}
                  role={showPasswordError ? 'alert' : undefined}
                >
                  Use at least 8 characters, including one letter, one number, and one special character.
                </p>
              )}
            </div>

            {authError && (
              <div role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs leading-relaxed text-red-700">
                {authError}
              </div>
            )}

            <button
              type="submit"
              className="w-full mt-2 py-3 brand-gradient text-white font-display font-700 text-sm rounded-xl hover:brightness-110 transition-all hover:scale-[1.01] active:scale-[0.99] shadow-lg shadow-[#8b5cf6]/20"
            >
              {isSignUp ? 'Create account' : 'Sign in'}
            </button>
          </form>

          <p className="text-center text-xs text-[#75647e] mt-6">
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button onClick={onSwitch} className="text-[#8b5cf6] hover:underline font-medium">
              {isSignUp ? 'Sign in' : 'Sign up'}
            </button>
          </p>
          </div>
        </div>
      </div>
    </div>
  )
}

function Dashboard({ user, tab, onTabChange, onUpdateName, onUpdateProfileImage, onUpdateLocation, onUpdateFoundationApplication, onSignOut }: {
  user: User
  tab: Tab
  onTabChange: (t: Tab) => void
  onUpdateName: (name: string) => void
  onUpdateProfileImage: (profileImage: string) => void
  onUpdateLocation: (location: string) => void
  onUpdateFoundationApplication: (application: FoundationApplication) => void
  onSignOut: () => void
}) {
  const [savedProgress] = useState(() => loadProgress(user.email))
  const [query, setQuery] = useState('')
  const [searchMenuOpen, setSearchMenuOpen] = useState(false)
  const [activeScreen, setActiveScreen] = useState<DashboardScreen>('home')
  const [coinBalance, setCoinBalance] = useState(savedProgress.coinBalance ?? user.coins)
  const [purchasedItems, setPurchasedItems] = useState<number[]>(savedProgress.purchasedItems ?? [])
  const [foundationRequestedItemIds, setFoundationRequestedItemIds] = useState<number[]>(savedProgress.foundationRequestedItemIds ?? [])
  const [foundationItem, setFoundationItem] = useState<MarketplaceItem | null>(null)
  const [foundationApplicantType, setFoundationApplicantType] = useState<FoundationApplicantType>('referred-family')
  const [foundationBeneficiaryName, setFoundationBeneficiaryName] = useState('')
  const [foundationConnection, setFoundationConnection] = useState('')
  const [foundationNeed, setFoundationNeed] = useState('')
  const [pendingExchangeItemIds, setPendingExchangeItemIds] = useState<number[]>(savedProgress.pendingExchangeItemIds ?? [])
  const [userEquipmentListings, setUserEquipmentListings] = useState<UserEquipmentListing[]>(savedProgress.userEquipmentListings ?? [])
  const [donorReviews, setDonorReviews] = useState<DonorReview[]>(savedProgress.donorReviews ?? SAMPLE_DONOR_REVIEWS)
  const [coinTransactions, setCoinTransactions] = useState<CoinTransaction[]>(savedProgress.coinTransactions ?? [])
  const [listingFormOpen, setListingFormOpen] = useState(false)
  const [listingImages, setListingImages] = useState<string[]>([])
  const [listingCategory, setListingCategory] = useState('Ball')
  const [listingBrand, setListingBrand] = useState('')
  const [listingColor, setListingColor] = useState('')
  const [listingSize, setListingSize] = useState('')
  const [listingAge, setListingAge] = useState('')
  const [listingCondition, setListingCondition] = useState('Good')
  const [listingTitle, setListingTitle] = useState('')
  const [listingDescription, setListingDescription] = useState('')
  const [listingCashEstimate, setListingCashEstimate] = useState(0)
  const [listingCoinValue, setListingCoinValue] = useState(0)
  const [publicDonor, setPublicDonor] = useState<string | null>(null)
  const [ratingExchange, setRatingExchange] = useState<{ exchangeKey: string; donor: string; itemName: string } | null>(null)
  const [ratingValue, setRatingValue] = useState(0)
  const [ratingReview, setRatingReview] = useState('')
  const [purchaseMessage, setPurchaseMessage] = useState('')
  const [editingName, setEditingName] = useState(false)
  const [draftName, setDraftName] = useState(user.name)
  const [editingLocation, setEditingLocation] = useState(false)
  const [draftLocation, setDraftLocation] = useState(user.location)
  const [filtersOpen, setFiltersOpen] = useState(false)
  const [desktopFiltersVisible, setDesktopFiltersVisible] = useState(true)
  const [wishlistRequests, setWishlistRequests] = useState<WishlistRequest[]>(savedProgress.wishlistRequests ?? INITIAL_WISHLIST)
  const [wishlistItem, setWishlistItem] = useState('')
  const [wishlistSport, setWishlistSport] = useState('')
  const [wishlistEquipmentSelection, setWishlistEquipmentSelection] = useState('')
  const [wishlistSportSelection, setWishlistSportSelection] = useState('')
  const [wishlistNote, setWishlistNote] = useState('')
  const [requestSportFilter, setRequestSportFilter] = useState('All')
  const [communityTab, setCommunityTab] = useState<'donations' | 'buy'>('donations')
  const [requestFormOpen, setRequestFormOpen] = useState(false)
  const [donationFormOpen, setDonationFormOpen] = useState(false)
  const [selectedConversation, setSelectedConversation] = useState(savedProgress.selectedConversation ?? 1)
  const [conversations, setConversations] = useState<Conversation[]>(savedProgress.conversations ?? CONVERSATIONS)
  const [messages, setMessages] = useState<Record<number, ChatMessage[]>>(savedProgress.messages ?? INITIAL_MESSAGES)
  const [messageDraft, setMessageDraft] = useState('')
  const [donations, setDonations] = useState<DonationItem[]>(savedProgress.donations ?? INITIAL_DONATIONS)
  const [donationItem, setDonationItem] = useState('')
  const [donationSport, setDonationSport] = useState('')
  const [donationCondition, setDonationCondition] = useState('Good')
  const [donationLocation, setDonationLocation] = useState('')
  const [donationNote, setDonationNote] = useState('')
  const [donationImages, setDonationImages] = useState<string[]>([])
  const [donationCategory, setDonationCategory] = useState('Other')
  const [donationOwnerValue, setDonationOwnerValue] = useState<string | null>(null)
  const donationEstimate = estimateEquipmentValue(donationCategory, donationCondition)
  const [donationPhotoIndexes, setDonationPhotoIndexes] = useState<Record<number, number>>({})
  const [editingDonationLocation, setEditingDonationLocation] = useState<number | null>(null)
  const [donationLocationDraft, setDonationLocationDraft] = useState('')
  const [imageViewer, setImageViewer] = useState<ImageViewerState | null>(null)
  const [confirmSignOut, setConfirmSignOut] = useState(false)
  const [markedSoldItemIds, setMarkedSoldItemIds] = useState<number[]>(
    savedProgress.markedSoldItemIds ?? SOLD_ITEMS.slice(0, 2).map(item => item.id),
  )
  const [sizeFilter, setSizeFilter] = useState('All')
  const [genderFilter, setGenderFilter] = useState('All')
  const [sportFilter, setSportFilter] = useState('All')
  const [conditionFilter, setConditionFilter] = useState('All')
  const [activityFilter, setActivityFilter] = useState('All')
  const [priceFilter, setPriceFilter] = useState('All')
  const [sortFilter, setSortFilter] = useState('Newest')

  const progressPersistenceSnapshot = JSON.stringify({
    email: user.email,
    progress: {
      coinBalance,
      purchasedItems,
      wishlistRequests,
      conversations,
      messages,
      selectedConversation,
      donations,
      markedSoldItemIds,
      foundationRequestedItemIds,
      pendingExchangeItemIds,
      userEquipmentListings,
      donorReviews,
      coinTransactions,
    } satisfies DashboardProgress,
  })

  const hasFilters =
    sizeFilter !== 'All' ||
    genderFilter !== 'All' ||
    sportFilter !== 'All' ||
    conditionFilter !== 'All' ||
    activityFilter !== 'All' ||
    priceFilter !== 'All' ||
    sortFilter !== 'Newest'
  const homeSearchItems = activeScreen === 'search' || query.trim() || hasFilters
    ? [...MARKETPLACE_ITEMS, ...userEquipmentListings.filter(item => item.status === 'active')]
        .filter(item => {
          const matchesQuery = !query.trim() ||
            query.trim().toLowerCase() === 'other' ||
            item.name.toLowerCase().includes(query.toLowerCase()) ||
            item.sport.toLowerCase().includes(query.toLowerCase())
          const matchesSize = sizeFilter === 'All' || item.size === sizeFilter
          const matchesGender = genderFilter === 'All' || item.gender === genderFilter
          const matchesSport =
            sportFilter === 'All' ||
            (sportFilter === 'Other'
              ? !SEARCH_CATEGORIES.filter(category => category !== 'Other').includes(item.sport)
              : item.sport === sportFilter)
          const matchesCondition = conditionFilter === 'All' || item.condition === conditionFilter
          const matchesAvailability =
            activityFilter === 'All' ||
            (activityFilter === 'Available' && !purchasedItems.includes(item.id)) ||
            (activityFilter === 'Purchased' && purchasedItems.includes(item.id))
          const matchesPrice =
            priceFilter === 'All' ||
            (priceFilter === 'Under 250' && item.coinCost < 250) ||
            (priceFilter === '250–500' && item.coinCost >= 250 && item.coinCost <= 500) ||
            (priceFilter === '500+' && item.coinCost > 500)
          return matchesQuery && matchesSize && matchesGender && matchesSport && matchesCondition && matchesAvailability && matchesPrice
        })
        .sort((a, b) => {
          if (sortFilter === 'Price: low to high') return a.coinCost - b.coinCost
          if (sortFilter === 'Price: high to low') return b.coinCost - a.coinCost
          if (sortFilter === 'Oldest') return a.id - b.id
          return b.id - a.id
        })
    : []
  const soldItems = SOLD_ITEMS.filter(item => markedSoldItemIds.includes(item.id))
  const activeListings = SOLD_ITEMS.filter(item => !markedSoldItemIds.includes(item.id))
  const activityItems = activeScreen === 'sold' ? soldItems : BOUGHT_ITEMS
  const items = activityItems
  const filteredWishlistRequests = wishlistRequests.filter(request => {
    if (requestSportFilter === 'All') return true
    if (requestSportFilter === 'Other') {
      return !SEARCH_CATEGORIES.filter(category => category !== 'Other').includes(request.sport)
    }
    return request.sport === requestSportFilter
  })
  const marketplaceSpent = [...MARKETPLACE_ITEMS, ...userEquipmentListings]
    .filter(item => purchasedItems.includes(item.id))
    .reduce((sum, item) => sum + item.coinCost, 0)
  const totalSpent = BOUGHT_ITEMS.reduce((sum, item) => sum + item.coins, 0) + marketplaceSpent
  const totalEarned =
    soldItems.reduce((sum, item) => sum + item.coins, 0) +
    userEquipmentListings.filter(item => item.status === 'completed').reduce((sum, item) => sum + item.coinCost, 0)
  const completedSalesCount = soldItems.length + userEquipmentListings.filter(item => item.status === 'completed').length
  const getDonorRating = (donor?: string) => {
    const reviews = donorReviews.filter(review => review.donor === donor)
    if (reviews.length === 0) return { average: 0, count: 0 }
    return {
      average: reviews.reduce((sum, review) => sum + review.rating, 0) / reviews.length,
      count: reviews.length,
    }
  }

  const changeTab = (nextTab: Tab) => {
    onTabChange(nextTab)
    setQuery('')
  }

  const navigateTo = (screen: DashboardScreen) => {
    setActiveScreen(screen)
    if (screen === 'bought' || screen === 'sold') {
      changeTab(screen)
    }
    window.scrollTo({ top: 0, behavior: 'instant' })
  }

  const applySportFilter = (sport: string) => {
    setSportFilter(sport)
    if (sport === 'All') {
      if (SEARCH_CATEGORIES.includes(query)) setQuery('')
      return
    }
    setQuery(sport)
  }

  const buyWithCoins = (item: MarketplaceItem) => {
    if (purchasedItems.includes(item.id) || pendingExchangeItemIds.includes(item.id)) return
    setPendingExchangeItemIds(items => [...items, item.id])
    setPurchaseMessage(`${item.name} is pending pickup. Coins will change only after the exchange is completed.`)
  }

  const completeCommunityExchange = (item: MarketplaceItem) => {
    if (!pendingExchangeItemIds.includes(item.id)) return
    setCoinBalance(balance => balance - item.coinCost)
    setPurchasedItems(items => [...items, item.id])
    setPendingExchangeItemIds(items => items.filter(id => id !== item.id))
    setCoinTransactions(current => [{
      id: Date.now(),
      amount: -item.coinCost,
      itemName: item.name,
      type: 'spent',
      date: 'Just now',
      note: 'Completed Community Exchange',
    }, ...current])
    setPurchaseMessage(`${item.name} was completed for ${item.coinCost.toLocaleString()} representative coins. Negative balances are allowed.`)
  }

  const requestThroughFoundation = (item: MarketplaceItem) => {
    if (foundationRequestedItemIds.includes(item.id)) return
    if (user.foundationApplication?.status === 'approved') {
      setFoundationRequestedItemIds(current => [...current, item.id])
      setPurchaseMessage(`${item.name} was automatically approved through the GearUp Foundation.`)
      return
    }
    setFoundationItem(item)
  }

  const submitFoundationApplication = (event: React.FormEvent) => {
    event.preventDefault()
    const beneficiaryName = foundationBeneficiaryName.trim()
    const connection = foundationConnection.trim()
    const need = foundationNeed.trim()
    if (!beneficiaryName || !connection || !need) return
    onUpdateFoundationApplication({
      applicantType: foundationApplicantType,
      beneficiaryName,
      connection,
      need,
      status: 'pending',
      submittedAt: new Date().toLocaleDateString(),
      requestedItemId: foundationItem?.id,
      requestedItemName: foundationItem?.name,
    })
  }

  const saveProfileName = () => {
    const name = draftName.trim()
    if (!name) return
    onUpdateName(name)
    setEditingName(false)
  }

  const saveProfileLocation = () => {
    const location = draftLocation.trim()
    if (!location) return
    onUpdateLocation(location)
    setEditingLocation(false)
  }

  const addWishlistRequest = (event: React.FormEvent) => {
    event.preventDefault()
    const item = wishlistItem.trim()
    const sport = wishlistSport.trim()
    if (!item || !sport) return

    setWishlistRequests(requests => [
      {
        id: Date.now(),
        author: user.name,
        avatar: user.avatar,
        item,
        sport,
        note: wishlistNote.trim() || 'Let me know if you have one available.',
        posted: 'Just now',
      },
      ...requests,
    ])
    setWishlistItem('')
    setWishlistSport('')
    setWishlistEquipmentSelection('')
    setWishlistSportSelection('')
    setWishlistNote('')
    setRequestFormOpen(false)
  }

  const sendMessage = (event: React.FormEvent) => {
    event.preventDefault()
    const text = messageDraft.trim()
    if (!text) return

    setMessages(current => ({
      ...current,
      [selectedConversation]: [
        ...(current[selectedConversation] ?? []),
        {
          id: Date.now(),
          sender: 'me',
          text,
          time: new Intl.DateTimeFormat('en', { hour: 'numeric', minute: '2-digit' }).format(new Date()),
        },
      ],
    }))
    setMessageDraft('')
  }

  const openChatWith = (name: string, avatar: string, sport: string) => {
    if (name === user.name) return
    const existingConversation = conversations.find(conversation => conversation.name === name)
    if (existingConversation) {
      setSelectedConversation(existingConversation.id)
    } else {
      const id = Date.now()
      setConversations(current => [...current, { id, name, avatar, sport, online: false }])
      setMessages(current => ({
        ...current,
        [id]: [{ id: id + 1, sender: 'them', text: `Hi! Thanks for reaching out through GearUp.`, time: 'Now' }],
      }))
      setSelectedConversation(id)
    }
    navigateTo('messages')
  }

  const addDonation = (event: React.FormEvent) => {
    event.preventDefault()
    const item = donationItem.trim()
    const sport = donationSport.trim()
    const location = donationLocation.trim()
    if (!item || !sport || !location) return

    const fallbackImage = 'https://images.unsplash.com/photo-1646504458774-dbad0e941c14?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHw1fHx1c2VkJTIwc3BvcnRzJTIwZXF1aXBtZW50JTIwZm9vdGJhbGwlMjB0ZW5uaXMlMjBiYXNrZXRiYWxsJTIwZG9uYXRpb258ZW58MXx8fHwxNzkxNzY4MTMyfDA&ixlib=rb-4.1.0&q=80&w=1080'
    const images = donationImages.length > 0 ? donationImages : [fallbackImage]

    setDonations(current => [
      {
        id: Date.now(),
        item,
        sport,
        condition: donationCondition,
        location,
        note: donationNote.trim() || 'Free to an athlete or community group who can use it.',
        donor: user.name,
        avatar: user.avatar,
        image: images[0],
        images,
        claimedBy: undefined,
        ...(donationImages.length > 0 ? {
          estimatedCashValue: donationEstimate.cash,
          estimatedCoinValue: donationEstimate.coins,
          ...(donationOwnerValue !== null && Number(donationOwnerValue) > 0 ? {
            ownerCashValue: Number(donationOwnerValue),
            ownerCoinValue: Math.round(Number(donationOwnerValue) * COINS_PER_DOLLAR),
          } : {}),
        } : {}),
      },
      ...current,
    ])
    setDonationItem('')
    setDonationSport('')
    setDonationCondition('Good')
    setDonationLocation('')
    setDonationNote('')
    setDonationImages([])
    setDonationCategory('Other')
    setDonationOwnerValue(null)
    setDonationFormOpen(false)
  }

  const addDonationImages = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const availableSlots = MAX_DONATION_IMAGES - donationImages.length
    const selectedFiles = Array.from(event.target.files ?? []).slice(0, availableSlots)
    event.target.value = ''
    const imageUrls = await Promise.all(selectedFiles.map(fileToDataUrl))
    setDonationImages(current => [...current, ...imageUrls])
  }

  const generateListingSuggestions = () => {
    const age = Number.parseFloat(listingAge) || 0
    const { cash } = estimateEquipmentValue(listingCategory, listingCondition, age)
    const titleParts = [listingBrand.trim(), listingCategory].filter(Boolean)
    const knownDetails = [
      listingColor.trim() && `${listingColor.trim()} color`,
      listingSize.trim() && `size ${listingSize.trim()}`,
      listingCondition && `${listingCondition.toLowerCase()} condition`,
      listingAge.trim() && `approximately ${listingAge.trim()} year${listingAge.trim() === '1' ? '' : 's'} old`,
    ].filter(Boolean)
    setListingTitle(titleParts.join(' ') || 'Sports equipment')
    setListingDescription(
      knownDetails.length
        ? `${titleParts.join(' ') || 'Sports equipment'} in ${knownDetails.join(', ')}. Review the photos and add any model, fit, or wear details that are not visible.`
        : 'Photo uploaded. Add the equipment type, brand, color, size, age, and condition to improve this suggested description.',
    )
    setListingCashEstimate(cash)
    setListingCoinValue(Math.max(10, Math.round(cash * 3)))
  }

  const addListingImages = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(event.target.files ?? []).slice(0, MAX_DONATION_IMAGES)
    event.target.value = ''
    if (files.length === 0) return
    setListingImages(await Promise.all(files.map(fileToDataUrl)))
    window.setTimeout(generateListingSuggestions, 0)
  }

  const publishEquipmentListing = (event: React.FormEvent) => {
    event.preventDefault()
    if (!listingImages.length || !listingTitle.trim() || !listingDescription.trim() || listingCoinValue < 1) return
    const id = Date.now()
    setUserEquipmentListings(current => [{
      id,
      name: listingTitle.trim(),
      sport: listingCategory,
      coinCost: listingCoinValue,
      image: listingImages[0],
      images: listingImages,
      description: listingDescription.trim(),
      cashEstimate: listingCashEstimate,
      condition: listingCondition,
      size: listingSize || undefined,
      seller: user.name,
      ownerEmail: user.email,
      status: 'active',
    }, ...current])
    setListingFormOpen(false)
    setListingImages([])
    setListingBrand('')
    setListingColor('')
    setListingSize('')
    setListingAge('')
    setListingTitle('')
    setListingDescription('')
    setListingCashEstimate(0)
    setListingCoinValue(0)
  }

  const submitDonorReview = () => {
    if (!ratingExchange || ratingValue < 1) return
    if (donorReviews.some(review => review.exchangeKey === ratingExchange.exchangeKey && review.recipientEmail === user.email)) return
    setDonorReviews(current => [{
      id: Date.now(),
      exchangeKey: ratingExchange.exchangeKey,
      donor: ratingExchange.donor,
      recipientEmail: user.email,
      rating: ratingValue,
      review: ratingReview.trim(),
      itemName: ratingExchange.itemName,
      date: 'Just now',
    }, ...current])
    setRatingExchange(null)
    setRatingValue(0)
    setRatingReview('')
  }

  return (
    <div className="theme-page-background min-h-screen pb-[calc(6rem+env(safe-area-inset-bottom))]">
      <ProgressPersistence snapshot={progressPersistenceSnapshot} />
      <header className="bg-[#fff8fc]/95 backdrop-blur-xl sticky top-0 z-20 border-b border-[#eadff0]">
        <div className="max-w-6xl mx-auto px-4 sm:px-5 py-3 sm:py-4">
          <div className="flex items-center justify-between mb-4">
            <PlaymoreLogo size="sm" />
            <div className="flex items-center gap-2 sm:gap-3">
              <div className="flex items-center gap-1.5 sm:gap-2 bg-[#ffffff] border border-[#eadff0] rounded-full pl-1.5 sm:pl-2 pr-2.5 sm:pr-3 py-1">
                <CoinIcon className="w-7 h-7 sm:w-8 sm:h-8" />
                <div className="leading-none">
                  <div className="font-display font-800 text-sm text-[#241335]">{coinBalance.toLocaleString()}</div>
                  <div className="text-[9px] text-[#75647e] mt-1">My coins</div>
                </div>
              </div>
              <button
                onClick={() => navigateTo('profile')}
                className="w-10 h-10 rounded-full bg-[#f8f0fa] border border-[#eadff0] flex items-center justify-center text-xs font-display font-700 text-[#241335] hover:border-[#8b5cf6] transition-colors"
                aria-label="View profile"
                title="View profile"
              >
                {user.profileImage
                  ? <img src={user.profileImage} alt="" className="h-full w-full rounded-full object-cover" />
                  : user.avatar}
              </button>
            </div>
          </div>

          {activeScreen === 'search' && <>
          <div
            className="relative group"
            onBlur={event => {
              if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                setSearchMenuOpen(false)
              }
            }}
          >
            <svg
              viewBox="0 0 20 20"
              fill="none"
              className="absolute left-5 top-1/2 -translate-y-1/2 w-5 h-5 text-[#75647e] group-focus-within:text-[#8b5cf6] transition-colors pointer-events-none"
            >
              <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" strokeWidth="1.5" />
              <path d="M13 13l3.5 3.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            </svg>
            <input
              type="text"
              value={query}
              onChange={e => {
                setQuery(e.target.value)
                setSportFilter('All')
                setSearchMenuOpen(true)
              }}
              onFocus={() => setSearchMenuOpen(true)}
              onKeyDown={event => {
                if (event.key === 'Enter' && query.trim()) {
                  setSearchMenuOpen(false)
                  navigateTo('search')
                }
                if (event.key === 'Escape') setSearchMenuOpen(false)
              }}
              placeholder="Search equipment or sports..."
              aria-label="Search equipment by name or sport"
              role="combobox"
              aria-expanded={searchMenuOpen}
              aria-controls="search-category-options"
              aria-autocomplete="list"
              className="w-full bg-[#f8f0fa] border border-[#eadff0] rounded-full pl-13 pr-20 py-3.5 text-sm text-[#241335] placeholder-[#75647e] focus:outline-none focus:border-[#8b5cf6] focus:bg-white transition-all"
            />
            {query && (
              <button
                onClick={() => {
                  setQuery('')
                  setSearchMenuOpen(true)
                }}
                aria-label="Clear search"
                className="absolute right-12 top-1/2 -translate-y-1/2 text-[#75647e] hover:text-[#241335] transition-colors"
              >
                <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5">
                  <path d="M12 4L4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
              </button>
            )}
            <button
              type="button"
              onClick={() => setSearchMenuOpen(open => !open)}
              aria-label={searchMenuOpen ? 'Close search selections' : 'Show search selections'}
              aria-expanded={searchMenuOpen}
              aria-controls="search-category-options"
              className="absolute right-4 top-1/2 -translate-y-1/2 flex h-7 w-7 items-center justify-center rounded-full text-[#75647e] hover:bg-[#eadff0] hover:text-[#241335] transition-colors"
            >
              <svg viewBox="0 0 16 16" fill="none" className={`w-4 h-4 transition-transform ${searchMenuOpen ? 'rotate-180' : ''}`} aria-hidden="true">
                <path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            {searchMenuOpen && (
              <div
                id="search-category-options"
                role="listbox"
                aria-label="Search by sport"
                className="absolute inset-x-0 top-full z-40 mt-2 overflow-hidden rounded-2xl border border-[#eadff0] bg-white shadow-xl shadow-[#241335]/10"
              >
                <div className="flex items-center justify-between border-b border-[#eee3f1] px-4 py-3">
                  <div>
                    <div className="text-xs font-700 text-[#241335]">Browse by sport</div>
                    <div className="mt-0.5 text-[10px] text-[#75647e]">Choose a selection or keep typing your own search.</div>
                  </div>
                  <span className="rounded-full bg-[#f3e8ff] px-2.5 py-1 text-[9px] font-700 text-[#7c3aed]">{SEARCH_CATEGORIES.length} selections</span>
                </div>
                <div className="grid max-h-64 grid-cols-2 gap-1 overflow-y-auto p-2 sm:grid-cols-3">
                  {SEARCH_CATEGORIES.map(category => (
                    <button
                      key={category}
                      type="button"
                      role="option"
                      aria-selected={query === category}
                      onClick={() => {
                        setQuery(category)
                        setSportFilter(category)
                        setSearchMenuOpen(false)
                        navigateTo('search')
                      }}
                      className={`flex items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs font-600 transition-colors ${
                        query === category
                          ? 'bg-[#f3e8ff] text-[#7c3aed]'
                          : 'text-[#57445f] hover:bg-[#faf5ff] hover:text-[#241335]'
                      }`}
                    >
                      <span>{category}</span>
                      {query === category && (
                        <svg viewBox="0 0 16 16" fill="none" className="w-3.5 h-3.5" aria-hidden="true">
                          <path d="m3.5 8 3 3 6-6" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          {filtersOpen && (
            <div className="fixed inset-0 z-50">
              <button
                onClick={() => setFiltersOpen(false)}
                aria-label="Close search filters"
                className="absolute inset-0 bg-black/55 backdrop-blur-[2px]"
              />
              <div className="absolute inset-y-0 right-0 w-[88%] max-w-sm bg-[#fff8fc] border-l border-[#dfd2e4] shadow-2xl flex flex-col">
                <div className="flex items-center justify-between gap-4 px-5 py-5 border-b border-[#e8d9ee]">
                  <div>
                    <div className="font-display font-800 text-xl text-[#241335]">Filters</div>
                    <div className="text-[10px] text-[#75647e] mt-0.5">Refine your equipment search</div>
                  </div>
                  <button onClick={() => setFiltersOpen(false)} className="w-9 h-9 rounded-full bg-[#f7eff9] flex items-center justify-center text-[#75647e] hover:text-[#241335] transition-colors" aria-label="Close filters">
                    <svg viewBox="0 0 16 16" fill="none" className="w-4 h-4">
                      <path d="M12 4 4 12M4 4l8 8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                    </svg>
                  </button>
                </div>
                <div className="flex-1 overflow-y-auto px-5 py-4">
                  <FilterGroup label="Size" options={['All', 'S', 'M', 'L', 'XL']} value={sizeFilter} onChange={setSizeFilter} />
                  <FilterGroup label="Gender" options={['All', 'Men', 'Women', 'Kids', 'Unisex']} value={genderFilter} onChange={setGenderFilter} />
                  <FilterGroup label="Sport" options={['All', ...SEARCH_CATEGORIES]} value={sportFilter} onChange={applySportFilter} />
                  <FilterGroup label="Condition" options={['All', 'Like New', 'Very Good', 'Good']} value={conditionFilter} onChange={setConditionFilter} />
                  <FilterGroup label="Availability" options={['All', 'Available', 'Purchased']} value={activityFilter} onChange={setActivityFilter} />
                  <FilterGroup label="Coin price" options={['All', 'Under 250', '250–500', '500+']} value={priceFilter} onChange={setPriceFilter} />
                  <FilterGroup label="Sort by" options={['Newest', 'Oldest', 'Price: low to high', 'Price: high to low']} value={sortFilter} onChange={setSortFilter} />
                </div>
                <div className="grid grid-cols-2 gap-3 p-5 border-t border-[#dfd2e4] bg-[#fff8fc]">
                  <button
                    onClick={() => {
                      setSizeFilter('All')
                      setGenderFilter('All')
                      setSportFilter('All')
                      setConditionFilter('All')
                      setActivityFilter('All')
                      setPriceFilter('All')
                      setSortFilter('Newest')
                    }}
                    className="rounded-full border border-[#e8d9ee] py-3 text-xs font-700 text-[#57445f] hover:text-[#241335] hover:border-[#a28da9] transition-colors"
                  >
                    Clear all
                  </button>
                  <button onClick={() => setFiltersOpen(false)} className="rounded-full brand-gradient py-3 text-xs font-700 text-white hover:brightness-110 transition-colors">
                    Show {homeSearchItems.length} results
                  </button>
                </div>
              </div>
            </div>
          )}
          </>}
        </div>
      </header>

      <main id="home" className="max-w-6xl mx-auto px-4 sm:px-5 py-5 sm:py-8">
        {activeScreen === 'home' && <>
        <section className="relative min-h-72 sm:min-h-80 rounded-3xl overflow-hidden border border-[#eadff0] mb-5">
          <img
            src="https://images.unsplash.com/photo-1656333487413-ec0c3f56f3e7?w=1400&h=700&fit=crop&auto=format"
            alt="Athlete on a basketball court at sunset"
            className="absolute inset-0 w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-white via-white/85 to-white/10" />
          <div className="relative z-10 p-7 sm:p-10 max-w-lg">
            <span className="text-[10px] uppercase tracking-[0.2em] text-[#8b5cf6] font-600">Give gear a second life</span>
            <h1 className="font-display font-900 text-4xl sm:text-6xl text-[#241335] leading-[0.92] tracking-tight mt-3">
              Good gear.<br /><span className="brand-text-gradient">More game.</span>
            </h1>
            <p className="text-sm sm:text-base text-[#57445f] mt-4 max-w-sm">Trade the gear you have for the sports you love—and earn coins along the way.</p>
          </div>
        </section>

        <div className="mb-9">
          <div className="bg-[#ffffff] border border-[#eadff0] rounded-2xl p-4 flex items-center gap-3">
            <button onClick={() => navigateTo('donations')} className="w-full flex items-center gap-3 text-left">
              <div className="w-10 h-10 rounded-full bg-[#f3e8ff] flex items-center justify-center text-[#7c3aed] font-display font-800">+</div>
              <div><div className="font-display font-700 text-[#241335]">Donate your gear</div><div className="text-xs text-[#75647e] mt-1">Help someone else get in the game</div></div>
            </button>
          </div>
        </div>

        <section className="mb-9 rounded-3xl border border-[#eadff0] bg-white p-4 sm:p-6">
          <button
            type="button"
            onClick={() => setListingFormOpen(open => !open)}
            className="flex w-full items-center justify-between gap-4 text-left"
            aria-expanded={listingFormOpen}
          >
            <div>
              <span className="text-[10px] font-700 uppercase tracking-[0.16em] text-[#8b5cf6]">Community Exchange listing</span>
              <h2 className="mt-1 font-display text-xl font-800 text-[#241335]">List equipment</h2>
              <p className="mt-1 text-xs text-[#75647e]">Upload photos for editable demo descriptions and value suggestions.</p>
            </div>
            <span className="flex h-10 w-10 flex-none items-center justify-center rounded-full bg-[#f3e8ff] text-[#7c3aed]">
              <svg viewBox="0 0 16 16" fill="none" className={`h-4 w-4 transition-transform ${listingFormOpen ? 'rotate-180' : ''}`} aria-hidden="true"><path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" /></svg>
            </span>
          </button>

          {listingFormOpen && (
            <form onSubmit={publishEquipmentListing} className="mt-6 border-t border-[#eadff0] pt-6">
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-[10px] leading-relaxed text-amber-800">
                Demo mode: no AI image-recognition service is connected. Suggestions use the details you enter and sample valuation rules; they are not presented as real AI analysis.
              </div>
              <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="mb-2 block text-[10px] font-700 uppercase tracking-wide text-[#75647e]">Equipment type</label>
                  <select value={listingCategory} onChange={event => setListingCategory(event.target.value)} className="w-full rounded-xl border border-[#eadff0] bg-[#fffdf9] px-3 py-3 text-sm text-[#241335]">
                    {Object.keys(CASH_VALUE_BY_CATEGORY).map(category => <option key={category}>{category}</option>)}
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-[10px] font-700 uppercase tracking-wide text-[#75647e]">Brand, if known</label>
                  <input value={listingBrand} onChange={event => setListingBrand(event.target.value)} placeholder="e.g. Nike" className="w-full rounded-xl border border-[#eadff0] bg-[#fffdf9] px-4 py-3 text-sm text-[#241335]" />
                </div>
                <div>
                  <label className="mb-2 block text-[10px] font-700 uppercase tracking-wide text-[#75647e]">Condition</label>
                  <select value={listingCondition} onChange={event => setListingCondition(event.target.value)} className="w-full rounded-xl border border-[#eadff0] bg-[#fffdf9] px-3 py-3 text-sm text-[#241335]">
                    <option>Like New</option><option>Very Good</option><option>Good</option><option>Fair</option>
                  </select>
                </div>
                <div>
                  <label className="mb-2 block text-[10px] font-700 uppercase tracking-wide text-[#75647e]">Color</label>
                  <input value={listingColor} onChange={event => setListingColor(event.target.value)} placeholder="If visible or known" className="w-full rounded-xl border border-[#eadff0] bg-[#fffdf9] px-4 py-3 text-sm text-[#241335]" />
                </div>
                <div>
                  <label className="mb-2 block text-[10px] font-700 uppercase tracking-wide text-[#75647e]">Size</label>
                  <input value={listingSize} onChange={event => setListingSize(event.target.value)} placeholder="If applicable" className="w-full rounded-xl border border-[#eadff0] bg-[#fffdf9] px-4 py-3 text-sm text-[#241335]" />
                </div>
                <div>
                  <label className="mb-2 block text-[10px] font-700 uppercase tracking-wide text-[#75647e]">Age in years</label>
                  <input type="number" min="0" step="0.5" value={listingAge} onChange={event => setListingAge(event.target.value)} placeholder="Approximate" className="w-full rounded-xl border border-[#eadff0] bg-[#fffdf9] px-4 py-3 text-sm text-[#241335]" />
                </div>
              </div>
              <label className="mt-4 flex cursor-pointer items-center justify-center rounded-xl border border-dashed border-[#c4b5fd] bg-[#faf5ff] px-4 py-5 text-xs font-700 text-[#7c3aed] hover:bg-[#f3e8ff]">
                {listingImages.length ? `${listingImages.length} photo${listingImages.length === 1 ? '' : 's'} uploaded · Replace photos` : 'Upload one or more equipment photos'}
                <input type="file" accept="image/*" multiple onChange={addListingImages} className="sr-only" />
              </label>
              {listingImages.length > 0 && (
                <div className="mt-3 flex gap-2 overflow-x-auto">
                  {listingImages.map((image, index) => <img key={image} src={image} alt={`Listing view ${index + 1}`} className="h-20 w-20 flex-none rounded-lg object-cover" />)}
                </div>
              )}
              <button type="button" onClick={generateListingSuggestions} disabled={!listingImages.length} className="mt-4 rounded-xl border border-[#c4b5fd] bg-[#faf5ff] px-4 py-2.5 text-xs font-700 text-[#7c3aed] disabled:opacity-40">
                Generate or refresh demo suggestions
              </button>
              <div className="mt-5 grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-[10px] font-700 uppercase tracking-wide text-[#75647e]">Suggested title · Editable</label>
                  <input value={listingTitle} onChange={event => setListingTitle(event.target.value)} required className="w-full rounded-xl border border-[#eadff0] bg-[#fffdf9] px-4 py-3 text-sm text-[#241335]" />
                </div>
                <div className="sm:row-span-2">
                  <label className="mb-2 block text-[10px] font-700 uppercase tracking-wide text-[#75647e]">Suggested description · Editable</label>
                  <textarea value={listingDescription} onChange={event => setListingDescription(event.target.value)} rows={5} required className="w-full resize-none rounded-xl border border-[#eadff0] bg-[#fffdf9] px-4 py-3 text-sm text-[#241335]" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="mb-2 block text-[9px] font-700 uppercase tracking-wide text-[#75647e]">Estimated cash value</label>
                    <div className="relative"><span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-[#75647e]">$</span><input type="number" min="0" value={listingCashEstimate} onChange={event => setListingCashEstimate(Number(event.target.value))} className="w-full rounded-xl border border-[#eadff0] bg-[#fffdf9] py-3 pl-7 pr-3 text-sm text-[#241335]" /></div>
                    <p className="mt-1 text-[9px] text-[#75647e]">Informational estimate only.</p>
                  </div>
                  <div>
                    <label className="mb-2 block text-[9px] font-700 uppercase tracking-wide text-[#75647e]">Suggested coins</label>
                    <input type="number" min="1" value={listingCoinValue} onChange={event => setListingCoinValue(Number(event.target.value))} className="w-full rounded-xl border border-[#eadff0] bg-[#fffdf9] px-3 py-3 text-sm text-[#241335]" />
                    <p className="mt-1 text-[9px] text-[#75647e]">Editable community points.</p>
                  </div>
                </div>
              </div>
              <button type="submit" className="mt-5 rounded-xl brand-gradient px-6 py-3 text-sm font-700 text-white">Publish listing</button>
            </form>
          )}
        </section>

        <section className="mb-9">
          <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
            <div>
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#8b5cf6] font-600">Your marketplace</span>
              <h2 className="mt-2 font-display text-2xl font-900 text-[#241335]">Active listings</h2>
              <p className="mt-1 text-xs text-[#75647e]">Items you listed that have not been sold yet.</p>
            </div>
            <span className="rounded-full bg-[#f3e8ff] px-3 py-1.5 text-[10px] font-700 text-[#7c3aed]">{activeListings.length + userEquipmentListings.filter(item => item.status === 'active').length} active</span>
          </div>

          {activeListings.length + userEquipmentListings.filter(item => item.status === 'active').length > 0 ? (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {activeListings.map(item => (
                <article key={item.id} className="overflow-hidden rounded-2xl border border-[#eadff0] bg-white">
                  <button
                    type="button"
                    onClick={() => setImageViewer({ title: item.name, images: [item.image], index: 0 })}
                    className="relative block h-40 w-full overflow-hidden bg-[#f8f0fa]"
                    aria-label={`View image of ${item.name}`}
                  >
                    <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                    <span className="absolute left-3 top-3 rounded-full border border-white bg-white/90 px-3 py-1 text-[9px] font-700 uppercase tracking-wide text-[#7c3aed]">Listed</span>
                    <span className="absolute bottom-3 right-3 rounded-full bg-[#241335]/85 px-3 py-1.5 text-[9px] font-700 text-white">View image</span>
                  </button>
                  <div className="p-4">
                    <div className="text-[9px] uppercase tracking-wide text-[#75647e]">{item.sport} · {item.condition}</div>
                    <h3 className="mt-1.5 font-display text-sm font-800 text-[#241335]">{item.name}</h3>
                    <div className="mt-3 flex items-center gap-1.5">
                      <CoinIcon className="h-5 w-5" />
                      <span className="font-display text-sm font-800 text-[#241335]">{item.coins.toLocaleString()} coins</span>
                    </div>
                    <div className="mt-3 flex items-center gap-1.5 rounded-lg bg-[#f8f0fa] px-3 py-2 text-[10px] font-600 text-[#57445f]">
                      <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 flex-none text-[#8b5cf6]" aria-hidden="true">
                        <path d="M8 14s4.5-4 4.5-7.5a4.5 4.5 0 1 0-9 0C3.5 10 8 14 8 14Z" stroke="currentColor" strokeWidth="1.3" />
                        <circle cx="8" cy="6.5" r="1.5" stroke="currentColor" strokeWidth="1.3" />
                      </svg>
                      Meetup near {user.location}
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setMarkedSoldItemIds(current => [...current, item.id])
                        setCoinBalance(balance => balance + item.coins)
                        setCoinTransactions(current => [{ id: Date.now(), amount: item.coins, itemName: item.name, type: 'earned', date: 'Just now', note: 'Completed Community Exchange' }, ...current])
                      }}
                      className="mt-3 w-full rounded-xl brand-gradient py-2.5 text-[10px] font-700 text-white hover:brightness-110"
                    >
                      Mark as sold
                    </button>
                  </div>
                </article>
              ))}
              {userEquipmentListings.filter(item => item.status === 'active').map(item => (
                <article key={item.id} className="overflow-hidden rounded-2xl border border-[#eadff0] bg-white">
                  <button type="button" onClick={() => setImageViewer({ title: item.name, images: item.images, index: 0 })} className="relative block h-40 w-full overflow-hidden bg-[#f8f0fa]">
                    <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                    <span className="absolute left-3 top-3 rounded-full bg-white/90 px-3 py-1 text-[9px] font-700 uppercase text-[#7c3aed]">Your listing</span>
                  </button>
                  <div className="p-4">
                    <div className="text-[9px] uppercase tracking-wide text-[#75647e]">{item.sport} · {item.condition}</div>
                    <h3 className="mt-1.5 font-display text-sm font-800 text-[#241335]">{item.name}</h3>
                    <p className="mt-2 line-clamp-2 text-[10px] leading-relaxed text-[#75647e]">{item.description}</p>
                    <div className="mt-3 flex items-center justify-between gap-3">
                      <span className="font-display text-sm font-800 text-[#241335]">{item.coinCost} coins</span>
                      <span className="text-[9px] text-[#75647e]">Est. ${item.cashEstimate}</span>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setUserEquipmentListings(current => current.map(listing => listing.id === item.id ? { ...listing, status: 'completed' } : listing))
                        setCoinBalance(balance => balance + item.coinCost)
                        setCoinTransactions(current => [{ id: Date.now(), amount: item.coinCost, itemName: item.name, type: 'earned', date: 'Just now', note: 'Completed Community Exchange' }, ...current])
                      }}
                      className="mt-3 w-full rounded-xl brand-gradient py-2.5 text-[10px] font-700 text-white"
                    >
                      Mark exchange completed
                    </button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-dashed border-[#d8c8de] bg-white px-6 py-8 text-center">
              <div className="font-display text-sm font-700 text-[#241335]">No active listings</div>
              <p className="mt-1 text-xs text-[#75647e]">Items you list for sale will appear here until they are marked sold.</p>
            </div>
          )}
        </section>
        </>}

        {activeScreen === 'search' && <section className="min-h-[70vh]">
            {purchaseMessage && (
              <div className="mb-4 rounded-xl border border-[#e9d5ff] bg-[#faf5ff] px-4 py-3 text-xs text-[#1e3a5f]">
                {purchaseMessage}
              </div>
            )}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <div>
                <h2 className="font-display font-800 text-2xl text-[#241335]">Search results</h2>
                <p className="text-xs text-[#75647e] mt-1">
                  {homeSearchItems.length} available item{homeSearchItems.length === 1 ? '' : 's'}
                  {query ? ` for “${query}”` : ''}
                </p>
              </div>
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setFiltersOpen(true)}
                  className="lg:hidden flex items-center gap-2 text-xs font-600 text-[#57445f] hover:text-[#241335]"
                >
                  Filters
                  <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4">
                    <path d="M3 6h14M6 14h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                    <circle cx="7" cy="6" r="1.5" fill="#fff8fc" stroke="currentColor" />
                    <circle cx="13" cy="14" r="1.5" fill="#fff8fc" stroke="currentColor" />
                  </svg>
                </button>
                <button
                  onClick={() => setDesktopFiltersVisible(visible => !visible)}
                  className="hidden lg:flex items-center gap-2 text-xs font-600 text-[#57445f] hover:text-[#241335]"
                >
                  {desktopFiltersVisible ? 'Hide filters' : 'Show filters'}
                  <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4">
                    <path d="M3 6h14M6 14h8" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                    <circle cx="7" cy="6" r="1.5" fill="#fff8fc" stroke="currentColor" />
                    <circle cx="13" cy="14" r="1.5" fill="#fff8fc" stroke="currentColor" />
                  </svg>
                </button>
                <button
                  onClick={() => {
                    setQuery('')
                    setSizeFilter('All')
                    setGenderFilter('All')
                    setSportFilter('All')
                    setConditionFilter('All')
                    setActivityFilter('All')
                    setPriceFilter('All')
                    setSortFilter('Newest')
                  }}
                  className="text-xs font-medium text-[#8b5cf6] hover:text-[#a855f7]"
                >
                  Clear search
                </button>
              </div>
            </div>
            <div className={`lg:grid lg:items-start ${desktopFiltersVisible ? 'lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-6' : 'lg:grid-cols-1'}`}>
              {desktopFiltersVisible && <div className="hidden lg:block sticky top-32 border-r border-[#e8d9ee] pr-5 max-h-[calc(100vh-10rem)] overflow-y-auto">
                <div className="flex items-center justify-between pb-3 border-b border-[#e8d9ee]">
                  <div className="font-display font-800 text-lg text-[#241335]">Filter & sort</div>
                  {hasFilters && (
                    <button
                      onClick={() => {
                        setSizeFilter('All')
                        setGenderFilter('All')
                        setSportFilter('All')
                        setConditionFilter('All')
                        setActivityFilter('All')
                        setPriceFilter('All')
                        setSortFilter('Newest')
                      }}
                      className="text-[9px] font-600 text-[#6ea3fa] hover:text-[#f0abfc]"
                    >
                      Reset
                    </button>
                  )}
                </div>
                <FilterGroup label="Size" options={['All', 'S', 'M', 'L', 'XL']} value={sizeFilter} onChange={setSizeFilter} />
                <FilterGroup label="Gender" options={['All', 'Men', 'Women', 'Kids', 'Unisex']} value={genderFilter} onChange={setGenderFilter} />
                <FilterGroup label="Sport" options={['All', ...SEARCH_CATEGORIES]} value={sportFilter} onChange={applySportFilter} />
                <FilterGroup label="Condition" options={['All', 'Like New', 'Very Good', 'Good']} value={conditionFilter} onChange={setConditionFilter} />
                <FilterGroup label="Availability" options={['All', 'Available', 'Purchased']} value={activityFilter} onChange={setActivityFilter} />
                <FilterGroup label="Coin price" options={['All', 'Under 250', '250–500', '500+']} value={priceFilter} onChange={setPriceFilter} />
                <FilterGroup label="Sort by" options={['Newest', 'Oldest', 'Price: low to high', 'Price: high to low']} value={sortFilter} onChange={setSortFilter} />
              </div>}

            {homeSearchItems.length > 0 ? (
              <div className={`grid grid-cols-1 min-[430px]:grid-cols-2 md:grid-cols-3 gap-3 sm:gap-4 ${desktopFiltersVisible ? 'lg:grid-cols-2 xl:grid-cols-3' : 'lg:grid-cols-3 xl:grid-cols-4'}`}>
                {homeSearchItems.map(item => (
                  <MarketplaceCard
                    key={item.id}
                    item={item}
                    purchased={purchasedItems.includes(item.id)}
                    pending={pendingExchangeItemIds.includes(item.id)}
                    canAfford={coinBalance >= item.coinCost}
                    onBuy={() => buyWithCoins(item)}
                    onFoundationRequest={() => requestThroughFoundation(item)}
                    foundationRequested={foundationRequestedItemIds.includes(item.id)}
                    donorRating={getDonorRating(item.seller)}
                    onViewDonor={() => item.seller && setPublicDonor(item.seller)}
                    onChat={() => item.seller && openChatWith(item.seller, item.seller.split(' ').map(part => part[0]).join(''), item.sport)}
                    onViewImage={() => setImageViewer({ title: item.name, images: [item.image], index: 0 })}
                  />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-16 text-center bg-[#ffffff] border border-[#eadff0] rounded-3xl">
                <p className="font-display font-600 text-[#75647e] text-sm">No equipment matches these filters.</p>
              </div>
            )}
            </div>
          </section>}

        {activeScreen === 'donations' && <section className="min-h-[70vh]">
          <div className="mb-5 grid grid-cols-2 rounded-2xl border border-[#eadff0] bg-white p-1.5 shadow-sm">
            <button
              type="button"
              onClick={() => setCommunityTab('donations')}
              className={`rounded-xl px-4 py-3 text-xs font-700 transition-colors ${
                communityTab === 'donations' ? 'brand-gradient text-white' : 'text-[#75647e] hover:bg-[#faf5ff] hover:text-[#241335]'
              }`}
            >
              Donations
            </button>
            <button
              type="button"
              onClick={() => setCommunityTab('buy')}
              className={`rounded-xl px-4 py-3 text-xs font-700 transition-colors ${
                communityTab === 'buy' ? 'brand-gradient text-white' : 'text-[#75647e] hover:bg-[#faf5ff] hover:text-[#241335]'
              }`}
            >
              Buy
            </button>
          </div>

          <div className="rounded-3xl bg-gradient-to-r from-[#241335] via-[#6d28d9] to-[#0891b2] p-7 sm:p-10 text-white mb-6">
            <span className="text-[10px] uppercase tracking-[0.2em] text-[#f0abfc] font-600">
              {communityTab === 'donations' ? 'Free gear. Real impact.' : 'Nearby gear. Community powered.'}
            </span>
            <h1 className="font-display font-900 text-4xl sm:text-5xl mt-2">
              {communityTab === 'donations' ? 'Donation hub' : 'Find free equipment'}
            </h1>
            <p className="text-sm text-[#dfd2e4] mt-3 max-w-xl">
              {communityTab === 'donations'
                ? 'Give unused equipment directly to athletes, schools, and community groups nearby.'
                : 'Browse donated equipment near you or request something the community can help you find.'}
              {' '}Donations never cost coins.
            </p>
            <div className="flex flex-wrap gap-5 mt-6 text-xs text-[#f3e8ff]">
              <span>{donations.length} items available</span>
              <span>Local pickup</span>
              <span>Always free</span>
            </div>
          </div>

          <div className="flex flex-col">
          <div className={`grid grid-cols-1 gap-6 items-start ${
            communityTab === 'buy' ? 'order-2 mt-10 border-t border-[#eadff0] pt-8' : 'order-1'
          }`}>
            {communityTab === 'donations' && (
              <button
                type="button"
                onClick={() => setDonationFormOpen(open => !open)}
                aria-expanded={donationFormOpen}
                aria-controls="community-donation-form"
                className="flex w-full items-center justify-between gap-4 rounded-2xl border border-[#eadff0] bg-white px-5 py-4 text-left shadow-sm transition-colors hover:border-[#c4b5fd]"
              >
                <span>
                  <span className="block font-display text-sm font-800 text-[#241335]">Donate an item</span>
                  <span className="mt-1 block text-[10px] text-[#75647e]">Add equipment details, pickup information, and photos.</span>
                </span>
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[#f3e8ff] text-[#7c3aed]">
                  <svg viewBox="0 0 16 16" fill="none" className={`h-4 w-4 transition-transform ${donationFormOpen ? 'rotate-180' : ''}`} aria-hidden="true">
                    <path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </button>
            )}
            {communityTab === 'donations' && donationFormOpen && (
            <form id="community-donation-form" onSubmit={addDonation} className="mx-auto w-full max-w-2xl rounded-3xl bg-white border border-[#eadff0] p-5 sm:p-6 shadow-sm">
              <h2 className="font-display font-800 text-xl text-[#241335]">Donate an item</h2>
              <p className="text-xs text-[#75647e] mt-1 mb-5">Tell the community what you’re ready to pass on.</p>

              <label className="block text-[10px] uppercase tracking-wide font-600 text-[#75647e] mb-2">Equipment</label>
              <input
                value={donationItem}
                onChange={event => setDonationItem(event.target.value)}
                placeholder="e.g. Junior soccer cleats"
                required
                className="w-full rounded-xl bg-[#fffdf9] border border-[#eadff0] px-4 py-3 text-sm text-[#241335] placeholder-[#a28da9] focus:outline-none focus:border-[#8b5cf6]"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-4">
                <div>
                  <label className="block text-[10px] uppercase tracking-wide font-600 text-[#75647e] mb-2">Sport</label>
                  <input
                    value={donationSport}
                    onChange={event => setDonationSport(event.target.value)}
                    placeholder="Soccer"
                    required
                    className="w-full rounded-xl bg-[#fffdf9] border border-[#eadff0] px-4 py-3 text-sm text-[#241335] placeholder-[#a28da9] focus:outline-none focus:border-[#8b5cf6]"
                  />
                </div>
                <div>
                  <label className="block text-[10px] uppercase tracking-wide font-600 text-[#75647e] mb-2">Condition</label>
                  <select
                    value={donationCondition}
                    onChange={event => setDonationCondition(event.target.value)}
                    className="w-full rounded-xl bg-[#fffdf9] border border-[#eadff0] px-3 py-3 text-sm text-[#241335] focus:outline-none focus:border-[#8b5cf6]"
                  >
                    <option>Like New</option>
                    <option>Very Good</option>
                    <option>Good</option>
                    <option>Fair</option>
                  </select>
                </div>
              </div>
              <label className="block text-[10px] uppercase tracking-wide font-600 text-[#75647e] mt-4 mb-2">Pickup location</label>
              <input
                value={donationLocation}
                onChange={event => setDonationLocation(event.target.value)}
                placeholder="e.g. Westside Community Center"
                required
                className="w-full rounded-xl bg-[#fffdf9] border border-[#eadff0] px-4 py-3 text-sm text-[#241335] placeholder-[#a28da9] focus:outline-none focus:border-[#8b5cf6]"
              />
              <label className="block text-[10px] uppercase tracking-wide font-600 text-[#75647e] mt-4 mb-2">Details</label>
              <textarea
                value={donationNote}
                onChange={event => setDonationNote(event.target.value)}
                placeholder="Sizes, quantity, or who it would be best for..."
                rows={3}
                className="w-full resize-none rounded-xl bg-[#fffdf9] border border-[#eadff0] px-4 py-3 text-sm text-[#241335] placeholder-[#a28da9] focus:outline-none focus:border-[#8b5cf6]"
              />
              <div className="mt-4">
                <div className="flex items-end justify-between gap-3 mb-2">
                  <label className="block text-[10px] uppercase tracking-wide font-600 text-[#75647e]">Item photos</label>
                  <span className="text-[10px] text-[#a28da9]">{donationImages.length}/{MAX_DONATION_IMAGES}</span>
                </div>
                <label
                  htmlFor="donation-images"
                  className={`flex cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed px-4 py-4 text-xs font-600 transition-colors ${
                    donationImages.length >= MAX_DONATION_IMAGES
                      ? 'cursor-not-allowed border-[#eadff0] bg-[#f8f0fa] text-[#a28da9]'
                      : 'border-[#c4b5fd] bg-[#faf5ff] text-[#7c3aed] hover:border-[#8b5cf6] hover:bg-[#f3e8ff]'
                  }`}
                >
                  <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5" aria-hidden="true">
                    <path d="M12 16V5m0 0L8 9m4-4 4 4M5 14v4a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                  {donationImages.length ? 'Add more views' : 'Upload item photos'}
                </label>
                <input
                  id="donation-images"
                  type="file"
                  accept="image/*"
                  multiple
                  disabled={donationImages.length >= MAX_DONATION_IMAGES}
                  onChange={addDonationImages}
                  className="sr-only"
                />
                <p className="mt-2 text-[10px] leading-relaxed text-[#75647e]">Show the front, back, sides, and any signs of wear. You can add up to 6 images.</p>
                {donationImages.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mt-3">
                    {donationImages.map((image, index) => (
                      <div key={image} className="relative aspect-square overflow-hidden rounded-lg border border-[#eadff0] bg-[#f8f0fa]">
                        <img src={image} alt={`Donation preview ${index + 1}`} className="w-full h-full object-cover" />
                        <button
                          type="button"
                          onClick={() => {
                            setDonationImages(current => current.filter((_, imageIndex) => imageIndex !== index))
                          }}
                          className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-[#241335]/85 text-white hover:bg-[#241335]"
                          aria-label={`Remove photo ${index + 1}`}
                        >
                          <svg viewBox="0 0 16 16" fill="none" className="w-3 h-3" aria-hidden="true">
                            <path d="m4 4 8 8m0-8-8 8" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
                          </svg>
                        </button>
                        {index === 0 && <span className="absolute bottom-1.5 left-1.5 rounded-full bg-white/90 px-2 py-1 text-[8px] font-700 uppercase tracking-wide text-[#7c3aed]">Cover</span>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              {donationImages.length > 0 && (
                <>
                  <label className="mt-4 block text-xs font-700 text-[#57445f]">Equipment type for estimate
                    <select value={donationCategory} onChange={event => setDonationCategory(event.target.value)} className="mt-2 w-full rounded-xl border border-[#eadff0] bg-[#fffdf9] px-3 py-3 text-sm text-[#241335]">
                      {Object.keys(CASH_VALUE_BY_CATEGORY).map(category => <option key={category}>{category}</option>)}
                    </select>
                  </label>
                  <EquipmentValuation cash={donationEstimate.cash} coins={donationEstimate.coins} ownerValue={donationOwnerValue} onOwnerValueChange={setDonationOwnerValue} />
                </>
              )}
              <button type="submit" className="w-full mt-4 rounded-xl brand-gradient py-3 text-sm font-display font-700 text-white hover:brightness-110 transition-colors">List for donation</button>
            </form>
            )}

            {communityTab === 'buy' && (
            <div>
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="font-display font-800 text-xl text-[#241335]">Donations near you</h2>
                  <p className="text-xs text-[#75647e] mt-1">Contact the donor to arrange a pickup.</p>
                </div>
                <span className="text-xs text-[#75647e]">{donations.length} available</span>
              </div>
              <div className="grid sm:grid-cols-2 gap-4">
                {donations.map(donation => {
                  const photos = donation.images?.length ? donation.images : [donation.image]
                  const photoIndex = (donationPhotoIndexes[donation.id] ?? 0) % photos.length
                  return (
                  <article key={donation.id} className="rounded-2xl bg-white border border-[#eadff0] overflow-hidden hover:border-[#f0abfc] transition-colors">
                    <div className="relative h-40 bg-[#f7eff9]">
                      <button
                        type="button"
                        onClick={() => setImageViewer({ title: donation.item, images: photos, index: photoIndex })}
                        className="absolute inset-0 w-full"
                        aria-label={`View photos of ${donation.item}`}
                      >
                        <img src={photos[photoIndex]} alt={`${donation.item}, view ${photoIndex + 1} of ${photos.length}`} className="w-full h-full object-cover" />
                      </button>
                      <span className="pointer-events-none absolute top-3 left-3 rounded-full bg-white/90 border border-white px-3 py-1 text-[9px] font-700 uppercase tracking-wide text-[#7c3aed]">Free donation</span>
                      <button
                        type="button"
                        onClick={() => setImageViewer({ title: donation.item, images: photos, index: photoIndex })}
                        className="absolute right-3 top-3 flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-[9px] font-700 text-[#241335] shadow-sm hover:bg-white"
                      >
                        View {photos.length > 1 ? 'photos' : 'image'}
                      </button>
                      {photos.length > 1 && (
                        <>
                          <button
                            type="button"
                            onClick={() => setDonationPhotoIndexes(current => ({
                              ...current,
                              [donation.id]: (photoIndex + 1) % photos.length,
                            }))}
                            className="absolute bottom-3 right-3 flex items-center gap-2 rounded-full bg-[#241335]/90 px-3 py-2 text-[10px] font-700 text-white backdrop-blur-sm hover:bg-[#241335]"
                            aria-label={`View next photo of ${donation.item}`}
                          >
                            <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4" aria-hidden="true">
                              <rect x="3" y="4" width="14" height="12" rx="2" stroke="currentColor" strokeWidth="1.4" />
                              <circle cx="7" cy="8" r="1.4" fill="currentColor" />
                              <path d="m5 14 3.3-3 2.2 2 1.8-1.6L15 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                            {photoIndex + 1} / {photos.length} · Next
                          </button>
                          <div className="absolute bottom-3 left-3 flex gap-1" aria-hidden="true">
                            {photos.map((_, index) => (
                              <span key={index} className={`h-1.5 rounded-full transition-all ${index === photoIndex ? 'w-4 bg-white' : 'w-1.5 bg-white/60'}`} />
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                    <div className="p-5">
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-[9px] uppercase tracking-wide text-[#75647e]">{donation.sport} · {donation.condition}</span>
                        <span className="text-[9px] text-[#8b5cf6]">0 coins</span>
                      </div>
                      <h3 className="font-display font-800 text-lg text-[#241335] mt-2">{donation.item}</h3>
                      <p className="text-xs leading-relaxed text-[#75647e] mt-2">{donation.note}</p>
                      {donation.estimatedCashValue !== undefined && (
                        <div className="mt-3 rounded-xl bg-[#faf5ff] p-3 text-xs text-[#57445f]">
                          <p>App estimate: {donation.estimatedCoinValue?.toLocaleString()} coins / ${donation.estimatedCashValue.toFixed(2)} USD</p>
                          {donation.ownerCashValue !== undefined && <p className="mt-1 font-700">Owner's suggested value: {donation.ownerCoinValue?.toLocaleString()} coins / ${donation.ownerCashValue.toFixed(2)} USD</p>}
                          <p className="mt-1 text-[10px] text-[#75647e]">Free donation · Values are informational</p>
                        </div>
                      )}
                      <button type="button" onClick={() => setPublicDonor(donation.donor)} className="mt-2 text-[10px] font-700 text-[#7c3aed] hover:underline">
                        {getDonorRating(donation.donor).count > 0
                          ? `★ ${getDonorRating(donation.donor).average.toFixed(1)} (${getDonorRating(donation.donor).count} ratings)`
                          : 'No ratings yet'}
                      </button>
                      <div className="mt-4 rounded-xl bg-[#f8f0fa] px-3 py-2.5">
                        {editingDonationLocation === donation.id ? (
                          <div>
                            <label htmlFor={`donation-location-${donation.id}`} className="mb-1.5 block text-[9px] font-700 uppercase tracking-wide text-[#75647e]">Pickup location</label>
                            <input
                              id={`donation-location-${donation.id}`}
                              value={donationLocationDraft}
                              onChange={event => setDonationLocationDraft(event.target.value)}
                              onKeyDown={event => {
                                if (event.key === 'Escape') setEditingDonationLocation(null)
                              }}
                              autoFocus
                              className="w-full rounded-lg border border-[#c4b5fd] bg-white px-3 py-2 text-xs text-[#241335] focus:border-[#8b5cf6] focus:outline-none"
                            />
                            <div className="mt-2 flex gap-2">
                              <button
                                type="button"
                                disabled={!donationLocationDraft.trim()}
                                onClick={() => {
                                  const location = donationLocationDraft.trim()
                                  if (!location) return
                                  setDonations(current => current.map(item => item.id === donation.id ? { ...item, location } : item))
                                  setEditingDonationLocation(null)
                                }}
                                className="rounded-lg brand-gradient px-3 py-2 text-[9px] font-700 text-white disabled:opacity-40"
                              >
                                Save location
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingDonationLocation(null)}
                                className="rounded-lg border border-[#e8d9ee] bg-white px-3 py-2 text-[9px] font-700 text-[#75647e]"
                              >
                                Cancel
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="flex items-start justify-between gap-3">
                            <div className="flex min-w-0 items-start gap-2">
                              <svg viewBox="0 0 20 20" fill="none" className="w-4 h-4 text-[#8b5cf6] flex-none mt-0.5">
                                <path d="M10 18s6-5.4 6-10A6 6 0 1 0 4 8c0 4.6 6 10 6 10Z" stroke="currentColor" strokeWidth="1.5" /><circle cx="10" cy="8" r="2" stroke="currentColor" strokeWidth="1.5" />
                              </svg>
                              <span className="text-[10px] leading-relaxed text-[#57445f]">{donation.location}</span>
                            </div>
                            {donation.donor === user.name && (
                              <button
                                type="button"
                                onClick={() => {
                                  setDonationLocationDraft(donation.location)
                                  setEditingDonationLocation(donation.id)
                                }}
                                className="flex-none text-[9px] font-700 text-[#7c3aed] hover:underline"
                              >
                                Edit
                              </button>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-[#eee3f1]">
                        <button
                          onClick={() => openChatWith(donation.donor, donation.avatar, donation.sport)}
                          disabled={donation.donor === user.name}
                          className="flex items-center gap-2 text-left disabled:cursor-default"
                          aria-label={donation.donor === user.name ? 'Your donation' : `Chat with ${donation.donor}`}
                        >
                          <span className="w-8 h-8 rounded-full bg-[#f3e8ff] flex items-center justify-center text-[10px] font-display font-800 text-[#7c3aed]">{donation.avatar}</span>
                          <span>
                            <span className="block text-[10px] text-[#a28da9]">{donation.donor === user.name ? 'Donated by you' : 'Donated by'}</span>
                            <span className="block text-xs font-700 text-[#241335]">{donation.donor}</span>
                          </span>
                        </button>
                        {donation.donor !== user.name && (
                          <button onClick={() => openChatWith(donation.donor, donation.avatar, donation.sport)} className="rounded-full bg-[#faf5ff] px-4 py-2 text-[10px] font-700 text-[#7c3aed] hover:bg-[#f3e8ff] transition-colors">Chat</button>
                        )}
                      </div>
                    </div>
                  </article>
                  )
                })}
              </div>
            </div>
            )}
          </div>

          <div className={`${
            communityTab === 'buy' ? 'order-1' : 'order-2 mt-10 border-t border-[#eadff0] pt-8'
          }`}>
            <div className="mb-6">
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#8b5cf6] font-600">Community wishlist</span>
              <h2 className="font-display font-900 text-3xl text-[#241335] mt-2">
                {communityTab === 'donations' ? 'See what people need' : 'Request equipment'}
              </h2>
              <p className="text-sm text-[#75647e] mt-2">
                {communityTab === 'donations'
                  ? 'Find an athlete’s request that matches equipment you are ready to donate.'
                  : 'Post what you need so another athlete can donate it directly to you.'}
              </p>
            </div>

            {communityTab === 'buy' && (
              <button
                type="button"
                onClick={() => setRequestFormOpen(open => !open)}
                aria-expanded={requestFormOpen}
                aria-controls="community-request-form"
                className="mb-4 flex w-full items-center justify-between gap-4 rounded-2xl border border-[#eadff0] bg-white px-5 py-4 text-left shadow-sm transition-colors hover:border-[#c4b5fd]"
              >
                <span>
                  <span className="block font-display text-sm font-800 text-[#241335]">Request gear</span>
                  <span className="mt-1 block text-[10px] text-[#75647e]">Choose an equipment type and sport to ask the community.</span>
                </span>
                <span className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-[#f3e8ff] text-[#7c3aed]">
                  <svg viewBox="0 0 16 16" fill="none" className={`h-4 w-4 transition-transform ${requestFormOpen ? 'rotate-180' : ''}`} aria-hidden="true">
                    <path d="m4 6 4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
              </button>
            )}

            <div className="grid grid-cols-1 gap-6 items-start">
              {communityTab === 'buy' && requestFormOpen && (
              <form id="community-request-form" onSubmit={addWishlistRequest} className="mx-auto w-full max-w-2xl rounded-3xl bg-white border border-[#eadff0] p-5 sm:p-6 shadow-sm">
                <h3 className="font-display font-800 text-xl text-[#241335]">Request equipment</h3>
                <p className="text-xs text-[#75647e] mt-1 mb-5">Your request will appear beside available donations.</p>
                <label className="block text-[10px] uppercase tracking-wide font-600 text-[#75647e] mb-2">Equipment type</label>
                <select
                  value={wishlistEquipmentSelection}
                  onChange={event => {
                    const selection = event.target.value
                    setWishlistEquipmentSelection(selection)
                    setWishlistItem(selection === 'Other' ? '' : selection)
                  }}
                  required
                  className="w-full rounded-xl bg-[#fffdf9] border border-[#eadff0] px-4 py-3 text-sm text-[#241335] focus:outline-none focus:border-[#8b5cf6]"
                >
                  <option value="" disabled>Select equipment</option>
                  {EQUIPMENT_REQUEST_OPTIONS.map(option => <option key={option}>{option}</option>)}
                </select>
                {wishlistEquipmentSelection === 'Other' && (
                  <input
                    value={wishlistItem}
                    onChange={event => setWishlistItem(event.target.value)}
                    placeholder="Tell us what equipment you need"
                    aria-label="Other equipment type"
                    required
                    className="mt-2 w-full rounded-xl bg-[#fffdf9] border border-[#eadff0] px-4 py-3 text-sm text-[#241335] placeholder-[#a28da9] focus:outline-none focus:border-[#8b5cf6]"
                  />
                )}
                <label className="block text-[10px] uppercase tracking-wide font-600 text-[#75647e] mt-4 mb-2">Sport</label>
                <select
                  value={wishlistSportSelection}
                  onChange={event => {
                    const selection = event.target.value
                    setWishlistSportSelection(selection)
                    setWishlistSport(selection === 'Other' ? '' : selection)
                  }}
                  required
                  className="w-full rounded-xl bg-[#fffdf9] border border-[#eadff0] px-4 py-3 text-sm text-[#241335] focus:outline-none focus:border-[#8b5cf6]"
                >
                  <option value="" disabled>Select a sport</option>
                  {SEARCH_CATEGORIES.map(option => <option key={option}>{option}</option>)}
                </select>
                {wishlistSportSelection === 'Other' && (
                  <input
                    value={wishlistSport}
                    onChange={event => setWishlistSport(event.target.value)}
                    placeholder="Enter another sport"
                    aria-label="Other sport"
                    required
                    className="mt-2 w-full rounded-xl bg-[#fffdf9] border border-[#eadff0] px-4 py-3 text-sm text-[#241335] placeholder-[#a28da9] focus:outline-none focus:border-[#8b5cf6]"
                  />
                )}
                <label className="block text-[10px] uppercase tracking-wide font-600 text-[#75647e] mt-4 mb-2">Details</label>
                <textarea
                  value={wishlistNote}
                  onChange={event => setWishlistNote(event.target.value)}
                  placeholder="Size, condition, or who it is for..."
                  rows={3}
                  className="w-full resize-none rounded-xl bg-[#fffdf9] border border-[#eadff0] px-4 py-3 text-sm text-[#241335] placeholder-[#a28da9] focus:outline-none focus:border-[#8b5cf6]"
                />
                <button type="submit" className="w-full mt-4 rounded-xl bg-[#241335] py-3 text-sm font-display font-700 text-white hover:bg-[#253653] transition-colors">Post donation request</button>
              </form>
              )}

              {communityTab === 'donations' && (
              <div className="space-y-3">
                <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
                  <div>
                    <h3 className="font-display font-800 text-xl text-[#241335]">What athletes need</h3>
                    <span className="text-xs text-[#75647e]">{filteredWishlistRequests.length} of {wishlistRequests.length} requests</span>
                  </div>
                  <div>
                    <label htmlFor="request-sport-filter" className="mb-1.5 block text-[9px] font-700 uppercase tracking-wide text-[#75647e]">Filter requests</label>
                    <select
                      id="request-sport-filter"
                      value={requestSportFilter}
                      onChange={event => setRequestSportFilter(event.target.value)}
                      className="min-w-40 rounded-xl border border-[#eadff0] bg-white px-3 py-2.5 text-xs font-600 text-[#241335] focus:border-[#8b5cf6] focus:outline-none"
                    >
                      <option>All</option>
                      {SEARCH_CATEGORIES.map(category => <option key={category}>{category}</option>)}
                    </select>
                  </div>
                </div>
                {filteredWishlistRequests.map(request => (
                  <article key={request.id} className="rounded-2xl bg-white border border-[#eadff0] p-5 hover:border-[#f0abfc] transition-colors">
                    <div className="flex items-start gap-4">
                      <button
                        onClick={() => openChatWith(request.author, request.avatar, request.sport)}
                        disabled={request.author === user.name}
                        className="w-10 h-10 rounded-full bg-[#f3e8ff] flex items-center justify-center flex-none text-xs font-display font-800 text-[#7c3aed] hover:ring-2 hover:ring-[#f0abfc] disabled:hover:ring-0 transition-shadow"
                        aria-label={request.author === user.name ? 'Your request' : `Chat with ${request.author}`}
                      >
                        {request.avatar}
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div>
                            <span className="text-sm font-700 text-[#241335]">{request.author}</span>
                            <span className="text-[10px] text-[#a28da9] ml-2">{request.posted}</span>
                          </div>
                          <span className="rounded-full bg-[#faf5ff] px-3 py-1 text-[9px] font-700 text-[#7c3aed]">{request.sport}</span>
                        </div>
                        <h3 className="font-display font-800 text-lg text-[#241335] mt-3">{request.item}</h3>
                        <p className="text-xs leading-relaxed text-[#75647e] mt-1">{request.note}</p>
                        {request.author !== user.name && (
                          <button onClick={() => openChatWith(request.author, request.avatar, request.sport)} className="mt-4 rounded-full border border-[#e9d5ff] px-4 py-2 text-[10px] font-700 text-[#7c3aed] hover:bg-[#faf5ff] transition-colors">I can donate this · Chat</button>
                        )}
                      </div>
                    </div>
                  </article>
                ))}
                {filteredWishlistRequests.length === 0 && (
                  <div className="rounded-2xl border border-dashed border-[#d8c8de] bg-white px-6 py-10 text-center">
                    <div className="font-display text-sm font-700 text-[#241335]">No requests in this sport yet</div>
                    <p className="mt-1 text-xs text-[#75647e]">Choose another sport or view all community requests.</p>
                  </div>
                )}
              </div>
              )}
            </div>
          </div>
          </div>
        </section>}

        {(activeScreen === 'bought' || activeScreen === 'sold') && <section className="min-h-[70vh]">
          <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
            <div>
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#8b5cf6] font-600">Everything in one place</span>
              <h1 className="font-display font-900 text-4xl text-[#241335] mt-2">History</h1>
              <p className="text-xs text-[#75647e] mt-2">
                {activeScreen === 'bought'
                  ? `${BOUGHT_ITEMS.length + purchasedItems.length} items · ${totalSpent.toLocaleString()} coins spent`
                  : `${completedSalesCount} items · ${totalEarned.toLocaleString()} coins earned`}
              </p>
            </div>
          </div>

          <div className="mb-6 grid max-w-sm grid-cols-2 rounded-2xl border border-[#eadff0] bg-white p-1.5">
            <button
              type="button"
              onClick={() => navigateTo('bought')}
              className={`rounded-xl px-4 py-2.5 text-xs font-700 transition-colors ${
                activeScreen === 'bought' ? 'brand-gradient text-white' : 'text-[#75647e] hover:bg-[#faf5ff]'
              }`}
            >
              Bought
            </button>
            <button
              type="button"
              onClick={() => navigateTo('sold')}
              className={`rounded-xl px-4 py-2.5 text-xs font-700 transition-colors ${
                activeScreen === 'sold' ? 'brand-gradient text-white' : 'text-[#75647e] hover:bg-[#faf5ff]'
              }`}
            >
              Sold
            </button>
          </div>

          {activeScreen === 'bought' && pendingExchangeItemIds.length > 0 && (
            <div className="mb-8 rounded-2xl border border-amber-200 bg-amber-50 p-5">
              <h2 className="font-display text-lg font-800 text-amber-950">Pending Community Exchanges</h2>
              <p className="mt-1 text-xs text-amber-800">Complete an exchange only after the equipment handoff. Coins do not change for canceled or incomplete exchanges.</p>
              <div className="mt-4 space-y-3">
                {[...MARKETPLACE_ITEMS, ...userEquipmentListings].filter(item => pendingExchangeItemIds.includes(item.id)).map(item => (
                  <div key={item.id} className="flex flex-col gap-3 rounded-xl bg-white p-4 sm:flex-row sm:items-center">
                    <img src={item.image} alt="" className="h-16 w-16 rounded-lg object-cover" />
                    <div className="min-w-0 flex-1">
                      <div className="font-display text-sm font-700 text-[#241335]">{item.name}</div>
                      <div className="mt-1 text-[10px] text-[#75647e]">{item.coinCost} representative coins · Meetup near {getSellerMeetupLocation(item.seller)}</div>
                    </div>
                    <div className="flex gap-2">
                      <button onClick={() => completeCommunityExchange(item)} className="rounded-xl brand-gradient px-4 py-2.5 text-[10px] font-700 text-white">Mark completed</button>
                      <button onClick={() => setPendingExchangeItemIds(current => current.filter(id => id !== item.id))} className="rounded-xl border border-[#e8d9ee] px-4 py-2.5 text-[10px] font-700 text-[#75647e]">Cancel</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="grid grid-cols-1 min-[430px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
            {items.map(item => (
              <ItemCard
                key={item.id}
                item={item}
                mode={activeScreen}
                onChat={() => {
                  const contact = activeScreen === 'sold' ? item.buyer : item.seller
                  if (contact) openChatWith(contact, contact.split(' ').map(part => part[0]).join(''), item.sport)
                }}
                onViewImage={() => setImageViewer({ title: item.name, images: [item.image], index: 0 })}
                meetupLocation={activeScreen === 'sold' ? user.location : getSellerMeetupLocation(item.seller)}
                markedSold={markedSoldItemIds.includes(item.id)}
                onToggleSold={() => setMarkedSoldItemIds(current => current.includes(item.id)
                  ? current.filter(id => id !== item.id)
                  : [...current, item.id])}
                onRateProvider={() => item.seller && setRatingExchange({ exchangeKey: `history-${item.id}`, donor: item.seller, itemName: item.name })}
                reviewed={donorReviews.some(review => review.exchangeKey === `history-${item.id}` && review.recipientEmail === user.email)}
              />
            ))}
          </div>
          {activeScreen === 'sold' && userEquipmentListings.some(item => item.status === 'completed') && (
            <>
              <h2 className="mt-9 mb-4 font-display text-xl font-800 text-[#241335]">Completed equipment listings</h2>
              <div className="grid grid-cols-1 gap-3 min-[430px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                {userEquipmentListings.filter(item => item.status === 'completed').map(item => (
                  <article key={item.id} className="overflow-hidden rounded-2xl border border-[#eadff0] bg-white">
                    <button type="button" onClick={() => setImageViewer({ title: item.name, images: item.images, index: 0 })} className="h-36 w-full overflow-hidden bg-[#f8f0fa]">
                      <img src={item.image} alt={item.name} className="h-full w-full object-cover" />
                    </button>
                    <div className="p-4">
                      <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[9px] font-700 text-emerald-700">Completed</span>
                      <h3 className="mt-3 font-display text-sm font-800 text-[#241335]">{item.name}</h3>
                      <div className="mt-2 font-display text-sm font-800 text-emerald-600">+{item.coinCost} coins</div>
                      <div className="mt-1 text-[9px] text-[#75647e]">Community Exchange · Cash estimate did not affect coins</div>
                    </div>
                  </article>
                ))}
              </div>
            </>
          )}
          {activeScreen === 'bought' && purchasedItems.length > 0 && (
            <>
              <h2 className="font-display font-800 text-xl text-[#241335] mt-9 mb-4">Recent marketplace purchases</h2>
              <div className="grid grid-cols-1 min-[430px]:grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-3 sm:gap-4">
                {[...MARKETPLACE_ITEMS, ...userEquipmentListings].filter(item => purchasedItems.includes(item.id)).map(item => (
                  <MarketplaceCard
                    key={item.id}
                    item={item}
                    purchased
                    pending={false}
                    canAfford
                    onBuy={() => {}}
                    onFoundationRequest={() => requestThroughFoundation(item)}
                    foundationRequested={foundationRequestedItemIds.includes(item.id)}
                    donorRating={getDonorRating(item.seller)}
                    onViewDonor={() => item.seller && setPublicDonor(item.seller)}
                    onChat={() => item.seller && openChatWith(item.seller, item.seller.split(' ').map(part => part[0]).join(''), item.sport)}
                    onViewImage={() => setImageViewer({ title: item.name, images: [item.image], index: 0 })}
                    onRateProvider={() => item.seller && setRatingExchange({ exchangeKey: `marketplace-${item.id}`, donor: item.seller, itemName: item.name })}
                    reviewed={donorReviews.some(review => review.exchangeKey === `marketplace-${item.id}` && review.recipientEmail === user.email)}
                  />
                ))}
              </div>
            </>
          )}
        </section>}

        {activeScreen === 'coins' && <section className="min-h-[70vh] rounded-3xl bg-gradient-to-r from-[#fff7ed] via-[#fdf2f8] to-[#ecfeff] border border-[#e9d5ff] p-6 sm:p-10 overflow-hidden relative">
          <div className="absolute -right-10 -top-16 w-48 h-48 rounded-full bg-[#ec4899]/15 blur-2xl" />
          <div className="relative">
            <div className="max-w-xl">
              <span className="text-[10px] uppercase tracking-[0.2em] text-[#a8c8ff] font-600">GearUp coins</span>
              <h1 className="font-display font-900 text-4xl sm:text-5xl text-[#241335] mt-2">Your coin wallet</h1>
              <p className="text-sm text-[#57445f] mt-3">Representative community points only. Coins cannot be purchased, withdrawn, exchanged for cash, or treated as financial debt.</p>
              <div className="grid grid-cols-2 gap-3 mt-8">
                <ProfileStat label="Current balance" value={`${coinBalance.toLocaleString()} coins`} detail={coinBalance < 0 ? 'Negative balances are allowed' : 'Community points available'} />
                <ProfileStat label="Lifetime earned" value={totalEarned.toLocaleString()} detail="From equipment sold" />
              </div>
            </div>

            <div className="mt-10 border-t border-[#e9d5ff] pt-8">
              <h2 className="font-display text-2xl font-800 text-[#241335]">Coin transaction history</h2>
              <p className="mt-1 text-xs text-[#57445f]">Balances update only when a Community Exchange is marked completed. Foundation requests never charge coins.</p>
              <div className="mt-5 space-y-2">
                {coinTransactions.length > 0 ? coinTransactions.map(transaction => (
                  <div key={transaction.id} className="flex items-center justify-between gap-4 rounded-xl border border-[#eadff0] bg-white/80 px-4 py-3">
                    <div className="min-w-0">
                      <div className="truncate text-xs font-700 text-[#241335]">{transaction.itemName}</div>
                      <div className="mt-1 text-[9px] text-[#75647e]">{transaction.note} · {transaction.date}</div>
                    </div>
                    <div className={`flex-none font-display text-sm font-800 ${transaction.amount > 0 ? 'text-emerald-600' : 'text-[#ec4899]'}`}>
                      {transaction.amount > 0 ? '+' : ''}{transaction.amount} coins
                    </div>
                  </div>
                )) : (
                  <div className="rounded-xl border border-dashed border-[#d8c8de] bg-white/60 px-5 py-7 text-center text-xs text-[#75647e]">Completed exchange transactions will appear here.</div>
                )}
              </div>
            </div>

            <div className="mt-10 pt-8 border-t border-[#e9d5ff]">
              <h2 className="font-display font-800 text-2xl text-[#241335]">One balance. Every trade.</h2>
              <p className="text-xs text-[#57445f] mt-1 max-w-lg">GearUp uses coins for every marketplace purchase, so there are no cash prices or separate equipment shop.</p>
              <button onClick={() => navigateTo('search')} className="mt-5 rounded-full brand-gradient px-6 py-3 text-sm font-display font-700 text-white hover:brightness-110 transition-colors">
                Browse community gear
              </button>
            </div>
          </div>
        </section>}

        {activeScreen === 'messages' && <section className="min-h-[70vh]">
          <div className="mb-6">
            <span className="text-[10px] uppercase tracking-[0.2em] text-[#8b5cf6] font-600">Your community</span>
            <h1 className="font-display font-900 text-4xl text-[#241335] mt-2">Messages</h1>
            <p className="text-sm text-[#75647e] mt-2">Talk gear, arrange exchanges, and find people to play with.</p>
          </div>

          <div className="grid md:grid-cols-[280px_minmax(0,1fr)] bg-white border border-[#eadff0] rounded-3xl overflow-hidden min-h-[560px]">
            <aside className="border-b md:border-b-0 md:border-r border-[#eadff0]">
              <div className="px-5 py-4 border-b border-[#eadff0] font-display font-700 text-sm text-[#241335]">Conversations</div>
              <div className="flex md:block min-w-0 overflow-x-auto">
                {conversations.map(conversation => {
                  const conversationMessages = messages[conversation.id] ?? []
                  const latestMessage = conversationMessages[conversationMessages.length - 1]
                  return (
                    <button
                      key={conversation.id}
                      onClick={() => setSelectedConversation(conversation.id)}
                      className={`min-w-64 shrink-0 md:min-w-0 w-full text-left flex items-center gap-3 p-4 border-r md:border-r-0 md:border-b border-[#eee3f1] transition-colors ${
                        selectedConversation === conversation.id ? 'bg-[#faf5ff]' : 'hover:bg-[#fffdf9]'
                      }`}
                    >
                      <div className="relative flex-none">
                        <div className="w-11 h-11 rounded-full bg-[#f3e8ff] flex items-center justify-center text-xs font-display font-800 text-[#7c3aed]">{conversation.avatar}</div>
                        {conversation.online && <span className="absolute right-0 bottom-0 w-3 h-3 rounded-full bg-emerald-400 border-2 border-white" />}
                      </div>
                      <div className="min-w-0">
                        <div className="font-700 text-sm text-[#241335] truncate">{conversation.name}</div>
                        <div className="text-[10px] text-[#75647e] truncate mt-1">{latestMessage?.text}</div>
                      </div>
                    </button>
                  )
                })}
              </div>
            </aside>

            {conversations.filter(conversation => conversation.id === selectedConversation).map(conversation => (
              <div key={conversation.id} className="flex flex-col min-h-[440px]">
                <div className="flex items-center gap-3 px-5 py-4 border-b border-[#eadff0]">
                  <div className="w-10 h-10 rounded-full bg-[#f3e8ff] flex items-center justify-center text-xs font-display font-800 text-[#7c3aed]">{conversation.avatar}</div>
                  <div>
                    <div className="font-display font-700 text-sm text-[#241335]">{conversation.name}</div>
                    <div className="text-[10px] text-[#75647e]">{conversation.online ? 'Online now' : conversation.sport} · GearUp athlete</div>
                  </div>
                </div>

                <div className="flex-1 p-5 sm:p-6 space-y-4 bg-[#fffdf9] overflow-y-auto">
                  {(messages[conversation.id] ?? []).map(message => (
                    <div key={message.id} className={`flex ${message.sender === 'me' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[80%] sm:max-w-[65%] rounded-2xl px-4 py-3 ${
                        message.sender === 'me'
                          ? 'brand-gradient text-white rounded-br-md'
                          : 'bg-white border border-[#eadff0] text-[#241335] rounded-bl-md'
                      }`}>
                        <p className="text-xs sm:text-sm leading-relaxed">{message.text}</p>
                        <div className={`text-[9px] mt-1.5 ${message.sender === 'me' ? 'text-[#f3e8ff]' : 'text-[#a28da9]'}`}>{message.time}</div>
                      </div>
                    </div>
                  ))}
                </div>

                <form onSubmit={sendMessage} className="p-4 border-t border-[#eadff0] flex gap-2 bg-white">
                  <input
                    value={messageDraft}
                    onChange={event => setMessageDraft(event.target.value)}
                    placeholder={`Message ${conversation.name.split(' ')[0]}...`}
                    aria-label={`Message ${conversation.name}`}
                    className="min-w-0 flex-1 rounded-full bg-[#f8f0fa] border border-[#eadff0] px-5 py-3 text-sm text-[#241335] placeholder-[#a28da9] focus:outline-none focus:border-[#8b5cf6]"
                  />
                  <button type="submit" disabled={!messageDraft.trim()} className="rounded-full brand-gradient px-5 py-3 text-xs font-display font-700 text-white hover:brightness-110 disabled:opacity-40 disabled:cursor-default transition-colors">Send</button>
                </form>
              </div>
            ))}
          </div>
        </section>}

        {activeScreen === 'profile' && <section className="min-h-[70vh] rounded-3xl bg-[#ffffff] border border-[#eadff0] overflow-hidden">
          <div className="relative px-6 py-8 sm:px-10 sm:py-10 border-b border-[#eadff0]">
            <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-r from-[#fef3c7] via-[#fce7f3] to-[#cffafe]" />
            <div className="relative flex flex-col sm:flex-row sm:items-end gap-4 pt-8">
              <div className="relative w-24 flex-none">
                <div className="w-24 h-24 overflow-hidden rounded-full brand-gradient border-4 border-[#ffffff] flex items-center justify-center shadow-xl shadow-black/30">
                  {user.profileImage
                    ? <img src={user.profileImage} alt={`${user.name}'s profile`} className="h-full w-full object-cover" />
                    : <span className="font-display font-800 text-2xl text-white">{user.avatar}</span>}
                </div>
                <label
                  htmlFor="profile-photo"
                  className="absolute -bottom-1 left-1/2 flex -translate-x-1/2 cursor-pointer items-center gap-1 whitespace-nowrap rounded-full border border-[#e8d9ee] bg-white px-3 py-1.5 text-[9px] font-700 text-[#57445f] shadow-md hover:border-[#8b5cf6] hover:text-[#7c3aed]"
                >
                  <svg viewBox="0 0 16 16" fill="none" className="h-3 w-3" aria-hidden="true">
                    <path d="M3 5.5h2l1-1.5h4l1 1.5h2v7H3v-7Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" />
                    <circle cx="8" cy="8.5" r="2" stroke="currentColor" strokeWidth="1.3" />
                  </svg>
                  {user.profileImage ? 'Change photo' : 'Add photo'}
                </label>
                <input
                  id="profile-photo"
                  type="file"
                  accept="image/*"
                  className="sr-only"
                  onChange={async event => {
                    const file = event.target.files?.[0]
                    if (!file) return
                    event.target.value = ''
                    onUpdateProfileImage(await fileToDataUrl(file))
                  }}
                />
              </div>
              <div className="flex-1">
                {editingName ? (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <input
                      value={draftName}
                      onChange={event => setDraftName(event.target.value)}
                      onKeyDown={event => {
                        if (event.key === 'Enter') saveProfileName()
                        if (event.key === 'Escape') {
                          setDraftName(user.name)
                          setEditingName(false)
                        }
                      }}
                      aria-label="Profile name"
                      autoFocus
                      className="min-w-0 flex-1 rounded-xl bg-[#ffffff] border border-[#8b5cf6] px-4 py-2.5 font-display font-700 text-[#241335] focus:outline-none"
                    />
                    <button onClick={saveProfileName} className="rounded-xl brand-gradient px-4 py-2.5 text-xs font-700 text-white hover:brightness-110 transition-colors">Save name</button>
                    <button onClick={() => { setDraftName(user.name); setEditingName(false) }} className="rounded-xl bg-[#ffffff] px-4 py-2.5 text-xs font-600 text-[#57445f] hover:text-[#241335] transition-colors">Cancel</button>
                  </div>
                ) : (
                  <div className="flex flex-wrap items-center gap-3">
                    <h2 className="break-words font-display font-800 text-2xl sm:text-3xl text-[#241335]">{user.name}</h2>
                    <button
                      onClick={() => { setDraftName(user.name); setEditingName(true) }}
                      className="rounded-full border border-[#e8d9ee] bg-[#ffffff] px-3 py-1.5 text-[10px] font-600 text-[#75647e] hover:text-[#241335] hover:border-[#8b5cf6] transition-colors"
                    >
                      Edit name
                    </button>
                  </div>
                )}
                <p className="text-sm text-[#75647e] mt-1">{user.email}</p>
                {editingLocation ? (
                  <div className="mt-3 flex max-w-xl flex-col gap-2 sm:flex-row">
                    <div className="relative min-w-0 flex-1">
                      <svg viewBox="0 0 16 16" fill="none" className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[#8b5cf6]" aria-hidden="true">
                        <path d="M8 14s4.5-4 4.5-7.5a4.5 4.5 0 1 0-9 0C3.5 10 8 14 8 14Z" stroke="currentColor" strokeWidth="1.3" />
                        <circle cx="8" cy="6.5" r="1.5" stroke="currentColor" strokeWidth="1.3" />
                      </svg>
                      <input
                        value={draftLocation}
                        onChange={event => setDraftLocation(event.target.value)}
                        onKeyDown={event => {
                          if (event.key === 'Enter') saveProfileLocation()
                          if (event.key === 'Escape') {
                            setDraftLocation(user.location)
                            setEditingLocation(false)
                          }
                        }}
                        placeholder="City or neighborhood"
                        aria-label="Meetup area"
                        autoFocus
                        className="w-full rounded-xl border border-[#8b5cf6] bg-white py-2.5 pl-9 pr-3 text-xs text-[#241335] focus:outline-none"
                      />
                    </div>
                    <button
                      type="button"
                      disabled={!draftLocation.trim()}
                      onClick={saveProfileLocation}
                      className="rounded-xl brand-gradient px-4 py-2.5 text-xs font-700 text-white disabled:opacity-40"
                    >
                      Save area
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setDraftLocation(user.location)
                        setEditingLocation(false)
                      }}
                      className="rounded-xl border border-[#e8d9ee] bg-white px-4 py-2.5 text-xs font-600 text-[#57445f]"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <div className="mt-2 flex flex-wrap items-center gap-2">
                    <p className="flex items-center gap-1.5 text-xs font-600 text-[#8b5cf6]">
                      <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
                        <path d="M8 14s4.5-4 4.5-7.5a4.5 4.5 0 1 0-9 0C3.5 10 8 14 8 14Z" stroke="currentColor" strokeWidth="1.3" />
                        <circle cx="8" cy="6.5" r="1.5" stroke="currentColor" strokeWidth="1.3" />
                      </svg>
                      Meetup area: {user.location}
                    </p>
                    <button
                      type="button"
                      onClick={() => {
                        setDraftLocation(user.location)
                        setEditingLocation(true)
                      }}
                      className="rounded-full border border-[#e8d9ee] bg-white px-3 py-1 text-[9px] font-700 text-[#75647e] hover:border-[#8b5cf6] hover:text-[#7c3aed]"
                    >
                      Edit location
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="p-6 sm:p-10">
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <ProfileStat label="Coins available" value={coinBalance.toLocaleString()} detail="Ready to spend" />
              <ProfileStat label="Equipment bought" value={(BOUGHT_ITEMS.length + purchasedItems.length).toString()} detail={`${totalSpent.toLocaleString()} coins spent`} />
              <ProfileStat label="Equipment sold" value={completedSalesCount.toString()} detail={`${totalEarned.toLocaleString()} coins earned`} />
              <ProfileStat label="Total trades" value={(BOUGHT_ITEMS.length + completedSalesCount + purchasedItems.length).toString()} detail="Active since 2026" />
            </div>

            <div className="mt-6 rounded-2xl border border-[#d8c8de] bg-gradient-to-r from-[#fff7ed] via-[#fdf2f8] to-[#f5f3ff] p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <span className="text-[9px] font-700 uppercase tracking-[0.16em] text-[#7c3aed]">GearUp Foundation</span>
                  <div className="mt-1 font-display text-lg font-800 text-[#241335]">Assistance verification</div>
                  <p className="mt-1 max-w-xl text-xs leading-relaxed text-[#75647e]">
                    Verified families and community advocates receive automatic approval on future Foundation equipment requests.
                  </p>
                </div>
                <span className={`rounded-full px-3 py-1.5 text-[9px] font-700 uppercase tracking-wide ${
                  user.foundationApplication?.status === 'approved'
                    ? 'bg-emerald-100 text-emerald-700'
                    : user.foundationApplication?.status === 'pending'
                      ? 'bg-amber-100 text-amber-700'
                      : user.foundationApplication?.status === 'denied'
                        ? 'bg-red-100 text-red-700'
                        : 'bg-white text-[#75647e]'
                }`}>
                  {user.foundationApplication?.status ?? 'Not applied'}
                </span>
              </div>

              {user.foundationApplication && (
                <div className="mt-4 rounded-xl border border-white/80 bg-white/75 p-4">
                  <div className="text-[10px] text-[#75647e]">
                    Request for <span className="font-700 text-[#241335]">{user.foundationApplication.beneficiaryName}</span>
                    {' · '}{user.foundationApplication.connection}
                  </div>
                  <p className="mt-2 text-xs leading-relaxed text-[#57445f]">{user.foundationApplication.need}</p>
                  {user.foundationApplication.status === 'pending' && (
                    <div className="mt-4 border-t border-[#eadff0] pt-4">
                      <div className="text-[9px] font-700 uppercase tracking-wide text-[#75647e]">Foundation review desk</div>
                      <p className="mt-1 text-[10px] text-[#75647e]">Prototype reviewer controls for an authorized Foundation staff member.</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            const application = user.foundationApplication!
                            onUpdateFoundationApplication({ ...application, status: 'approved' })
                            if (application.requestedItemId && !foundationRequestedItemIds.includes(application.requestedItemId)) {
                              setFoundationRequestedItemIds(current => [...current, application.requestedItemId!])
                            }
                          }}
                          className="rounded-xl bg-emerald-600 px-4 py-2.5 text-[10px] font-700 text-white hover:bg-emerald-700"
                        >
                          Verify and approve
                        </button>
                        <button
                          type="button"
                          onClick={() => onUpdateFoundationApplication({ ...user.foundationApplication!, status: 'denied' })}
                          className="rounded-xl border border-red-200 bg-red-50 px-4 py-2.5 text-[10px] font-700 text-red-700 hover:bg-red-100"
                        >
                          Deny application
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            <div className="mt-6">
              <div className="rounded-2xl bg-[#fffdf9] border border-[#eadff0] p-5 flex items-center justify-between gap-4">
                <div>
                  <div className="font-display font-700 text-[#241335]">Trading impact</div>
                  <div className="text-xs text-[#75647e] mt-1">You helped give {completedSalesCount} pieces of gear a second life.</div>
                </div>
                <div className="w-12 h-12 rounded-full bg-[#f3e8ff] flex items-center justify-center text-[#8b5cf6] font-display font-800">{completedSalesCount}</div>
              </div>
            </div>

            <div className="mt-8 pt-6 border-t border-[#eadff0] flex justify-end">
              <button onClick={() => setConfirmSignOut(true)} className="rounded-full bg-[#f8f0fa] border border-[#eadff0] px-5 py-2.5 text-xs font-600 text-[#57445f] hover:text-[#241335] hover:border-[#a28da9] transition-colors">Sign out</button>
            </div>
          </div>
        </section>}
      </main>

      {publicDonor && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#160d20]/75 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={`${publicDonor} donor profile`}>
          <button className="absolute inset-0" onClick={() => setPublicDonor(null)} aria-label="Close donor profile" />
          <div className="relative z-10 max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-3xl bg-white p-6 shadow-2xl">
            <button onClick={() => setPublicDonor(null)} className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full bg-[#f8f0fa] text-[#57445f]" aria-label="Close"><span aria-hidden="true">×</span></button>
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 items-center justify-center rounded-full brand-gradient font-display text-lg font-800 text-white">{publicDonor.split(' ').map(part => part[0]).join('')}</div>
              <div>
                <h2 className="font-display text-2xl font-900 text-[#241335]">{publicDonor}</h2>
                {getDonorRating(publicDonor).count > 0 ? (
                  <div className="mt-1 text-sm font-700 text-amber-600">★ {getDonorRating(publicDonor).average.toFixed(1)} <span className="text-xs font-500 text-[#75647e]">({getDonorRating(publicDonor).count} ratings)</span></div>
                ) : <div className="mt-1 text-xs text-[#75647e]">No ratings yet</div>}
              </div>
            </div>
            <div className="mt-6 border-t border-[#eadff0] pt-5">
              <h3 className="font-display text-sm font-800 text-[#241335]">Recipient reviews</h3>
              <div className="mt-3 space-y-3">
                {donorReviews.filter(review => review.donor === publicDonor).map(review => (
                  <div key={review.id} className="rounded-xl bg-[#fffdf9] p-4">
                    <div className="flex items-center justify-between gap-3"><span className="text-xs text-amber-600">{'★'.repeat(review.rating)}{'☆'.repeat(5 - review.rating)}</span><span className="text-[9px] text-[#a28da9]">{review.date}</span></div>
                    <div className="mt-2 text-[10px] font-700 text-[#57445f]">{review.itemName}</div>
                    {review.review && <p className="mt-1 text-xs leading-relaxed text-[#75647e]">{review.review}</p>}
                  </div>
                ))}
                {getDonorRating(publicDonor).count === 0 && <div className="rounded-xl border border-dashed border-[#d8c8de] p-5 text-center text-xs text-[#75647e]">No ratings yet</div>}
              </div>
            </div>
          </div>
        </div>
      )}

      {ratingExchange && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#160d20]/75 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label="Rate equipment provider">
          <button className="absolute inset-0" onClick={() => setRatingExchange(null)} aria-label="Cancel rating" />
          <div className="relative z-10 w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl">
            <span className="text-[9px] font-700 uppercase tracking-[0.16em] text-[#8b5cf6]">Completed exchange</span>
            <h2 className="mt-2 font-display text-xl font-900 text-[#241335]">Rate {ratingExchange.donor}</h2>
            <p className="mt-1 text-xs text-[#75647e]">{ratingExchange.itemName} · One review allowed for this exchange.</p>
            <div className="mt-5 flex gap-2" aria-label="Star rating">
              {[1, 2, 3, 4, 5].map(star => (
                <button key={star} type="button" onClick={() => setRatingValue(star)} className={`text-3xl ${star <= ratingValue ? 'text-amber-400' : 'text-[#dfd2e4]'}`} aria-label={`${star} star${star === 1 ? '' : 's'}`}>★</button>
              ))}
            </div>
            <label className="mb-2 mt-5 block text-[10px] font-700 uppercase tracking-wide text-[#75647e]">Written review · Optional</label>
            <textarea value={ratingReview} onChange={event => setRatingReview(event.target.value)} rows={4} placeholder="Share how the exchange went..." className="w-full resize-none rounded-xl border border-[#eadff0] bg-[#fffdf9] px-4 py-3 text-sm text-[#241335]" />
            <div className="mt-5 grid grid-cols-2 gap-3">
              <button type="button" onClick={() => setRatingExchange(null)} className="rounded-xl border border-[#e8d9ee] py-3 text-xs font-700 text-[#57445f]">Cancel</button>
              <button type="button" onClick={submitDonorReview} disabled={ratingValue < 1} className="rounded-xl brand-gradient py-3 text-xs font-700 text-white disabled:opacity-40">Submit rating</button>
            </div>
          </div>
        </div>
      )}

      {foundationItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#160d20]/75 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="foundation-title">
          <button className="absolute inset-0" onClick={() => setFoundationItem(null)} aria-label="Close Foundation request" />
          <div className="relative z-10 max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-3xl border border-[#eadff0] bg-white shadow-2xl">
            <div className="brand-gradient p-6 text-white sm:p-8">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <span className="text-[9px] font-700 uppercase tracking-[0.18em] text-white/75">GearUp Foundation</span>
                  <h2 id="foundation-title" className="mt-2 font-display text-2xl font-900">Request equipment assistance</h2>
                  <p className="mt-2 text-xs leading-relaxed text-white/80">{foundationItem.name} · {foundationItem.coinCost.toLocaleString()} coins</p>
                </div>
                <button onClick={() => setFoundationItem(null)} className="flex h-9 w-9 flex-none items-center justify-center rounded-full bg-white/15 text-white hover:bg-white/25" aria-label="Close">
                  <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" aria-hidden="true"><path d="m4 4 8 8m0-8-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></svg>
                </button>
              </div>
            </div>

            <div className="p-5 sm:p-8">
              {user.foundationApplication?.status === 'pending' ? (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                  <div className="font-display text-lg font-800 text-amber-900">Application under review</div>
                  <p className="mt-2 text-xs leading-relaxed text-amber-800">A GearUp Foundation reviewer will verify the application before this equipment request can be approved. Your application status is saved to your account.</p>
                  <button onClick={() => setFoundationItem(null)} className="mt-4 rounded-xl bg-amber-700 px-5 py-2.5 text-xs font-700 text-white">Got it</button>
                </div>
              ) : (
                <form onSubmit={submitFoundationApplication}>
                  {user.foundationApplication?.status === 'denied' && (
                    <div className="mb-5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-xs text-red-700">
                      The previous application was not approved. You may update the information and apply again.
                    </div>
                  )}
                  <label className="block text-[10px] font-700 uppercase tracking-wide text-[#75647e]">Who is requesting support?</label>
                  <div className="mt-2 grid gap-2">
                    {[
                      { value: 'referred-family', label: 'Family referred by a school, coach, or nonprofit', detail: 'A partner introduced a new family to GearUp.' },
                      { value: 'playmore-family', label: 'Existing GearUp family needing assistance', detail: 'A current app user qualifies for nonprofit support.' },
                      { value: 'requesting-for-someone', label: 'Requesting for someone without the app', detail: 'Any person, coach, school, or organization may request on their behalf.' },
                    ].map(option => (
                      <button
                        key={option.value}
                        type="button"
                        onClick={() => setFoundationApplicantType(option.value as FoundationApplicantType)}
                        className={`rounded-xl border p-4 text-left transition-colors ${
                          foundationApplicantType === option.value
                            ? 'border-[#8b5cf6] bg-[#faf5ff]'
                            : 'border-[#eadff0] bg-white hover:border-[#c4b5fd]'
                        }`}
                      >
                        <span className="block text-xs font-700 text-[#241335]">{option.label}</span>
                        <span className="mt-1 block text-[10px] leading-relaxed text-[#75647e]">{option.detail}</span>
                      </button>
                    ))}
                  </div>

                  <div className="mt-5 grid gap-4 sm:grid-cols-2">
                    <div>
                      <label className="mb-2 block text-[10px] font-700 uppercase tracking-wide text-[#75647e]">Equipment recipient</label>
                      <input
                        value={foundationBeneficiaryName}
                        onChange={event => setFoundationBeneficiaryName(event.target.value)}
                        placeholder="Child, family, or program name"
                        required
                        className="w-full rounded-xl border border-[#eadff0] bg-[#fffdf9] px-4 py-3 text-sm text-[#241335] focus:border-[#8b5cf6] focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="mb-2 block text-[10px] font-700 uppercase tracking-wide text-[#75647e]">Your connection or referral</label>
                      <input
                        value={foundationConnection}
                        onChange={event => setFoundationConnection(event.target.value)}
                        placeholder="Parent, coach, school, nonprofit..."
                        required
                        className="w-full rounded-xl border border-[#eadff0] bg-[#fffdf9] px-4 py-3 text-sm text-[#241335] focus:border-[#8b5cf6] focus:outline-none"
                      />
                    </div>
                  </div>
                  <label className="mb-2 mt-4 block text-[10px] font-700 uppercase tracking-wide text-[#75647e]">Tell us about the equipment need</label>
                  <textarea
                    value={foundationNeed}
                    onChange={event => setFoundationNeed(event.target.value)}
                    placeholder="Explain who needs the equipment and how it will help them participate..."
                    rows={4}
                    required
                    className="w-full resize-none rounded-xl border border-[#eadff0] bg-[#fffdf9] px-4 py-3 text-sm text-[#241335] focus:border-[#8b5cf6] focus:outline-none"
                  />
                  <div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
                    <button type="button" onClick={() => setFoundationItem(null)} className="rounded-xl border border-[#e8d9ee] px-5 py-3 text-xs font-700 text-[#57445f]">Cancel</button>
                    <button type="submit" className="rounded-xl brand-gradient px-5 py-3 text-xs font-700 text-white hover:brightness-110">Submit for Foundation review</button>
                  </div>
                </form>
              )}
            </div>
          </div>
        </div>
      )}

      {confirmSignOut && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#160d20]/70 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="sign-out-title">
          <button className="absolute inset-0" onClick={() => setConfirmSignOut(false)} aria-label="Cancel sign out" />
          <div className="relative z-10 w-full max-w-sm rounded-3xl border border-[#eadff0] bg-white p-6 text-center shadow-2xl">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#f3e8ff] text-[#7c3aed]">
              <svg viewBox="0 0 24 24" fill="none" className="h-6 w-6" aria-hidden="true">
                <path d="M10 5H5v14h5m4-4 4-3-4-3m4 3H9" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </div>
            <h2 id="sign-out-title" className="mt-4 font-display text-xl font-800 text-[#241335]">Do you want to sign out?</h2>
            <p className="mt-2 text-xs leading-relaxed text-[#75647e]">Your progress is saved, and you can sign back in at any time.</p>
            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setConfirmSignOut(false)}
                className="rounded-xl border border-[#e8d9ee] bg-white py-3 text-xs font-700 text-[#57445f] hover:border-[#a28da9]"
              >
                Stay signed in
              </button>
              <button
                type="button"
                onClick={() => {
                  setConfirmSignOut(false)
                  onSignOut()
                }}
                className="rounded-xl brand-gradient py-3 text-xs font-700 text-white hover:brightness-110"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      )}

      {imageViewer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#160d20]/90 p-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-label={`${imageViewer.title} image viewer`}>
          <button className="absolute inset-0 cursor-zoom-out" onClick={() => setImageViewer(null)} aria-label="Close image viewer" />
          <div className="relative z-10 flex w-full max-w-4xl flex-col overflow-hidden rounded-3xl bg-white shadow-2xl">
            <div className="flex items-center justify-between gap-4 border-b border-[#eadff0] px-5 py-4">
              <div className="min-w-0">
                <div className="truncate font-display text-sm font-800 text-[#241335]">{imageViewer.title}</div>
                <div className="mt-0.5 text-[10px] text-[#75647e]">Image {imageViewer.index + 1} of {imageViewer.images.length}</div>
              </div>
              <button onClick={() => setImageViewer(null)} className="flex h-9 w-9 items-center justify-center rounded-full bg-[#f8f0fa] text-[#57445f] hover:bg-[#eadff0]" aria-label="Close image viewer">
                <svg viewBox="0 0 16 16" fill="none" className="h-4 w-4" aria-hidden="true">
                  <path d="m4 4 8 8m0-8-8 8" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" />
                </svg>
              </button>
            </div>
            <div className="relative flex h-[65vh] max-h-[680px] items-center justify-center bg-[#160d20]">
              <img src={imageViewer.images[imageViewer.index]} alt={`${imageViewer.title}, image ${imageViewer.index + 1}`} className="h-full w-full object-contain" />
              {imageViewer.images.length > 1 && (
                <>
                  <button
                    onClick={() => setImageViewer(current => current && ({ ...current, index: (current.index - 1 + current.images.length) % current.images.length }))}
                    className="absolute left-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-[#241335] shadow-lg hover:bg-white"
                    aria-label="Previous image"
                  >
                    <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden="true"><path d="m12 5-5 5 5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                  <button
                    onClick={() => setImageViewer(current => current && ({ ...current, index: (current.index + 1) % current.images.length }))}
                    className="absolute right-3 flex h-11 w-11 items-center justify-center rounded-full bg-white/90 text-[#241335] shadow-lg hover:bg-white"
                    aria-label="Next image"
                  >
                    <svg viewBox="0 0 20 20" fill="none" className="h-5 w-5" aria-hidden="true"><path d="m8 5 5 5-5 5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /></svg>
                  </button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      <nav className="mobile-safe-nav fixed bottom-0 inset-x-0 z-30 bg-[#ffffff]/95 backdrop-blur-xl border-t border-[#e8d9ee] px-1.5 sm:px-2 pt-2">
        <div className="grid grid-cols-6 max-w-4xl mx-auto">
          <BottomNavButton label="Home" icon="home" active={activeScreen === 'home'} onClick={() => navigateTo('home')} />
          <BottomNavButton label="Community" icon="donations" active={activeScreen === 'donations'} onClick={() => navigateTo('donations')} />
          <BottomNavButton label="History" icon="sold" active={activeScreen === 'bought' || activeScreen === 'sold'} onClick={() => navigateTo(tab)} />
          <BottomNavButton label="Coins" icon="coins" active={activeScreen === 'coins'} onClick={() => navigateTo('coins')} />
          <BottomNavButton label="Chat" icon="messages" active={activeScreen === 'messages'} onClick={() => navigateTo('messages')} />
          <BottomNavButton label="Profile" icon="profile" active={activeScreen === 'profile'} onClick={() => navigateTo('profile')} />
        </div>
      </nav>
    </div>
  )
}

type BottomNavIcon = 'home' | 'donations' | 'bought' | 'sold' | 'coins' | 'messages' | 'profile'

function FilterGroup({ label, options, value, onChange }: {
  label: string
  options: string[]
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="py-4 border-b border-[#e8d9ee] last:border-0">
      <div className="text-[10px] uppercase tracking-[0.14em] font-600 text-[#75647e] mb-3">{label}</div>
      <div className="flex flex-wrap gap-2">
        {options.map(option => (
          <button
            key={option}
            onClick={() => onChange(option)}
            className={`rounded-full border px-3 py-2 text-[10px] font-600 transition-colors ${
              value === option
                ? 'brand-gradient border-[#8b5cf6] text-white'
                : 'bg-[#fffdf9] border-[#e8d9ee] text-[#75647e] hover:border-[#a855f7] hover:text-[#241335]'
            }`}
          >
            {option}
          </button>
        ))}
      </div>
    </div>
  )
}

function BottomNavButton({ label, icon, active = false, onClick }: {
  label: string
  icon: BottomNavIcon
  active?: boolean
  onClick: () => void
}) {
  const paths: Record<BottomNavIcon, React.ReactNode> = {
    home: <path d="M3 11.5 12 4l9 7.5V21h-6v-6H9v6H3v-9.5Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />,
    donations: <><path d="M4 10h16v10H4V10Zm-1-4h18v4H3V6Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /><path d="M12 6v14m0-14c-1.2-2.8-5.3-3.3-5.3-.7C6.7 7 9.2 7 12 6Zm0 0c1.2-2.8 5.3-3.3 5.3-.7C17.3 7 14.8 7 12 6Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" /></>,
    bought: <path d="M6 8h12l-1 10H7L6 8Zm3 0V6a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" />,
    sold: <path d="M4 7h10l6 6-7 7-9-9V7Zm4 4h.01" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />,
    coins: <><circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="1.6" /><path d="m12 7 1.4 3 3.1.4-2.3 2.2.6 3.2-2.8-1.5-2.8 1.5.6-3.2-2.3-2.2 3.1-.4L12 7Z" stroke="currentColor" strokeWidth="1.3" strokeLinejoin="round" /></>,
    messages: <><path d="M4 5.5h16v11H9l-5 4v-15Z" stroke="currentColor" strokeWidth="1.6" strokeLinejoin="round" /><path d="M8 10h8M8 13h5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" /></>,
    profile: <><circle cx="12" cy="8" r="4" stroke="currentColor" strokeWidth="1.6" /><path d="M4.5 21c.6-4.2 3.1-6.3 7.5-6.3s6.9 2.1 7.5 6.3" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" /></>,
  }

  return (
    <button
      onClick={onClick}
      className={`min-w-0 flex flex-col items-center justify-center gap-1 px-0.5 py-1.5 transition-colors ${active ? 'text-[#8b5cf6]' : 'text-[#75647e] hover:text-[#241335]'}`}
    >
      <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 sm:w-6 sm:h-6">{paths[icon]}</svg>
      <span className="text-[8px] sm:text-[10px] font-600 w-full text-center leading-tight">{label}</span>
    </button>
  )
}

function MarketplaceCard({ item, purchased, pending, canAfford, onBuy, onFoundationRequest, foundationRequested, donorRating, onViewDonor, onChat, onViewImage, onRateProvider, reviewed }: {
  item: MarketplaceItem
  purchased: boolean
  pending: boolean
  canAfford: boolean
  onBuy: () => void
  onFoundationRequest: () => void
  foundationRequested: boolean
  donorRating: { average: number; count: number }
  onViewDonor: () => void
  onChat: () => void
  onViewImage: () => void
  onRateProvider?: () => void
  reviewed?: boolean
}) {
  return (
    <div className="bg-[#ffffff] border border-[#e8d9ee] rounded-2xl overflow-hidden hover:border-[#8b5cf6]/70 transition-colors">
      <button
        type="button"
        onClick={onViewImage}
        className="group/image relative block h-32 w-full overflow-hidden bg-[#f7eff9] sm:h-44"
        aria-label={`View image of ${item.name}`}
      >
        <img src={item.image} alt={item.name} className="w-full h-full object-cover" />
        <span className="absolute bottom-2 right-2 flex items-center gap-1.5 rounded-full bg-[#241335]/85 px-3 py-1.5 text-[9px] font-700 text-white backdrop-blur-sm group-hover/image:bg-[#241335]">
          <svg viewBox="0 0 20 20" fill="none" className="h-3.5 w-3.5" aria-hidden="true">
            <path d="M10 4.5c-4.2 0-7 5.5-7 5.5s2.8 5.5 7 5.5 7-5.5 7-5.5-2.8-5.5-7-5.5Z" stroke="currentColor" strokeWidth="1.4" />
            <circle cx="10" cy="10" r="2.2" stroke="currentColor" strokeWidth="1.4" />
          </svg>
          View image
        </span>
      </button>
      <div className="p-3 sm:p-4">
        <div className="text-[9px] uppercase tracking-wide text-[#75647e]">{item.sport} · {item.condition ?? 'Good'}</div>
        <h3 className="font-display font-700 text-xs sm:text-sm text-[#241335] mt-1.5 min-h-9">{item.name}</h3>
        {item.description && <p className="mt-1 line-clamp-2 text-[9px] leading-relaxed text-[#75647e]">{item.description}</p>}
        <div className="flex items-center gap-1.5 mt-3">
          <CoinIcon className="w-5 h-5" />
          <span className="font-display font-800 text-base text-[#241335]">{item.coinCost.toLocaleString()}</span>
          <span className="text-[9px] text-[#75647e]">coins</span>
        </div>
        {typeof item.cashEstimate === 'number' && (
          <div className="mt-1 text-[9px] text-[#75647e]">Estimated cash value: ${item.cashEstimate} · Informational only</div>
        )}
        <div className="mt-2 flex items-center gap-1.5 rounded-lg bg-[#f8f0fa] px-2.5 py-2 text-[9px] font-600 text-[#57445f]">
          <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 flex-none text-[#8b5cf6]" aria-hidden="true">
            <path d="M8 14s4.5-4 4.5-7.5a4.5 4.5 0 1 0-9 0C3.5 10 8 14 8 14Z" stroke="currentColor" strokeWidth="1.3" />
            <circle cx="8" cy="6.5" r="1.5" stroke="currentColor" strokeWidth="1.3" />
          </svg>
          Meetup near {getSellerMeetupLocation(item.seller)}
        </div>
        <button onClick={onChat} className="text-[9px] text-[#75647e] hover:text-[#7c3aed] mt-1 mb-3 transition-colors">
          Sold by <span className="font-700">{item.seller ?? 'a GearUp athlete'}</span> · Chat
        </button>
        <button type="button" onClick={onViewDonor} className="mb-3 block text-[10px] font-700 text-[#7c3aed] hover:underline">
          {donorRating.count > 0 ? `★ ${donorRating.average.toFixed(1)} (${donorRating.count} ratings)` : 'No ratings yet'}
        </button>
        <div className="space-y-2">
          <button
            onClick={onBuy}
            disabled={purchased || pending}
            className={`w-full rounded-xl px-2 py-2.5 text-[10px] font-display font-700 leading-tight transition-colors ${
            purchased
              ? 'bg-[#f7eff9] text-[#6f7f90] cursor-default'
              : pending
                ? 'bg-[#f7eff9] text-[#75647e] cursor-default'
                : 'brand-gradient text-white hover:brightness-110'
            }`}
          >
            {purchased ? 'Claimed through Community Exchange' : pending ? 'Pickup pending · Complete in History' : 'Claim through Community Exchange?'}
          </button>
          <button
            type="button"
            onClick={onFoundationRequest}
            disabled={purchased || foundationRequested}
            className="w-full rounded-xl border border-[#c4b5fd] bg-[#faf5ff] px-2 py-2.5 text-[10px] font-display font-700 leading-tight text-[#7c3aed] transition-colors hover:bg-[#f3e8ff] disabled:cursor-default disabled:border-[#eadff0] disabled:bg-[#f8f0fa] disabled:text-[#a28da9]"
          >
            {foundationRequested ? 'Foundation request approved' : 'Request through GearUp Foundation?'}
          </button>
        </div>
        {purchased && onRateProvider && (
          <button
            type="button"
            onClick={onRateProvider}
            disabled={reviewed}
            className="mt-2 w-full rounded-xl border border-[#fbbf24]/40 bg-amber-50 py-2.5 text-[10px] font-700 text-amber-700 disabled:text-[#a28da9]"
          >
            {reviewed ? 'Provider rated for this exchange' : 'Rate equipment provider'}
          </button>
        )}
      </div>
    </div>
  )
}

function ProfileStat({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-2xl bg-[#fffdf9] border border-[#eadff0] p-4 sm:p-5">
      <div className="text-[10px] sm:text-xs uppercase tracking-wide text-[#75647e]">{label}</div>
      <div className="font-display font-800 text-2xl sm:text-3xl text-[#241335] mt-2">{value}</div>
      <div className="text-[10px] sm:text-xs text-[#8b5cf6] mt-1">{detail}</div>
    </div>
  )
}

function ItemCard({ item, mode, onChat, onViewImage, meetupLocation, markedSold, onToggleSold, onRateProvider, reviewed }: {
  item: Item
  mode: Tab
  onChat: () => void
  onViewImage: () => void
  meetupLocation: string
  markedSold: boolean
  onToggleSold: () => void
  onRateProvider: () => void
  reviewed: boolean
}) {
  return (
    <div className="bg-[#ffffff] border border-[#eadff0] rounded-2xl overflow-hidden hover:border-[#8b5cf6]/60 transition-all group">
      <div className="relative overflow-hidden h-32 sm:h-44 bg-[#f8f0fa]">
        <button type="button" onClick={onViewImage} className="absolute inset-0 h-full w-full" aria-label={`View image of ${item.name}`}>
          <img
            src={item.image}
            alt={item.name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
          />
        </button>
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#ffffff]/80 to-transparent" />
        <span className="pointer-events-none absolute top-2 left-2 sm:top-3 sm:left-3 text-[9px] sm:text-[10px] font-medium text-[#57445f] bg-[#fffdf9]/75 backdrop-blur-sm px-2 py-1 rounded-full border border-[#eadff0]">
          {item.sport}
        </span>
        <span className={`pointer-events-none absolute bottom-2 left-2 sm:bottom-3 sm:left-3 text-[9px] sm:text-[10px] font-medium ${CONDITION_COLOR[item.condition] ?? 'text-[#75647e]'} bg-[#fffdf9]/75 backdrop-blur-sm px-2 py-1 rounded-full border border-[#eadff0]`}>
          {item.condition}
        </span>
        <button type="button" onClick={onViewImage} className="absolute bottom-2 right-2 rounded-full bg-[#241335]/85 px-2.5 py-1.5 text-[9px] font-700 text-white backdrop-blur-sm hover:bg-[#241335] sm:bottom-3 sm:right-3">
          View
        </button>
      </div>

      <div className="p-3 sm:p-4">
        <h3 className="font-display font-600 text-xs sm:text-sm text-[#241335] leading-tight mb-2 line-clamp-2">{item.name}</h3>
        <div className="text-[9px] text-[#75647e] mb-2">{item.gender} · Size {item.size}</div>
        <div className="mb-3 flex items-center gap-1.5 rounded-lg bg-[#f8f0fa] px-2.5 py-2 text-[9px] font-600 text-[#57445f]">
          <svg viewBox="0 0 16 16" fill="none" className="h-3.5 w-3.5 flex-none text-[#8b5cf6]" aria-hidden="true">
            <path d="M8 14s4.5-4 4.5-7.5a4.5 4.5 0 1 0-9 0C3.5 10 8 14 8 14Z" stroke="currentColor" strokeWidth="1.3" />
            <circle cx="8" cy="6.5" r="1.5" stroke="currentColor" strokeWidth="1.3" />
          </svg>
          Meetup near {meetupLocation}
        </div>

        {mode === 'bought' && item.seller && (
          <button onClick={onChat} className="flex items-center gap-2 mb-3 text-left group/profile">
            <div className="w-5 h-5 rounded-full bg-[#f3e8ff] border border-[#8b5cf6]/30 flex items-center justify-center flex-shrink-0">
              <span className="text-[8px] font-display font-700 text-[#8b5cf6]">{item.seller.split(' ')[0][0]}</span>
            </div>
            <div className="min-w-0">
              <span className="text-[9px] text-[#75647e]">Sold by</span>
              <span className="text-[10px] sm:text-xs font-medium text-[#57445f] group-hover/profile:text-[#7c3aed] ml-1">{item.seller} · Chat</span>
            </div>
          </button>
        )}

        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <div className="flex items-center gap-1">
              <CoinIcon className="w-4 h-4" />
              <span className="font-display font-700 text-sm sm:text-base text-[#241335]">
                {mode === 'sold' ? '+' : '−'}{item.coins.toLocaleString()} coins
              </span>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-[#75647e]">{item.date}</div>
            {mode === 'sold' && item.buyer && (
              <div className="text-[10px] text-[#75647e] mt-0.5">to {item.buyer}</div>
            )}
          </div>
        </div>
        {mode === 'sold' && (
          <button
            type="button"
            onClick={onToggleSold}
            className={`mt-3 w-full rounded-xl border py-2.5 text-[10px] font-700 transition-colors ${
              markedSold
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                : 'border-[#c4b5fd] bg-[#faf5ff] text-[#7c3aed] hover:bg-[#f3e8ff]'
            }`}
          >
            {markedSold ? 'Sold ✓ · Mark as available' : 'Mark this item as sold'}
          </button>
        )}
        {mode === 'bought' && item.seller && (
          <button
            type="button"
            onClick={onRateProvider}
            disabled={reviewed}
            className="mt-3 w-full rounded-xl border border-amber-200 bg-amber-50 py-2.5 text-[10px] font-700 text-amber-700 disabled:text-[#a28da9]"
          >
            {reviewed ? 'Provider rated for this exchange' : 'Rate equipment provider'}
          </button>
        )}
      </div>
    </div>
  )
}
