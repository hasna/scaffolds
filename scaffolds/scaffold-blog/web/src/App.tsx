import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { SettingsProvider } from '@/hooks/useSettings';
import { LegalSheetProvider } from '@/components/legal/LegalSheetProvider';
import { Toaster } from '@/components/ui/sonner';
import { ScrollToTop } from '@/components/layout/ScrollToTop'
import { LinkPreviewSheetProvider } from '@/components/link-preview/LinkPreviewSheetProvider'

// Public pages
import { Home } from '@/pages/Home';
import { Post } from '@/pages/Post';
import { Category } from '@/pages/Category';
import { Tag } from '@/pages/Tag';
import { Search } from '@/pages/Search';
import { Login } from '@/pages/Login';

// Admin pages
import { Dashboard } from '@/pages/admin/Dashboard';
import { Posts } from '@/pages/admin/Posts';
import { PostEdit } from '@/pages/admin/PostEdit';
import { Categories } from '@/pages/admin/Categories';
import { Tags } from '@/pages/admin/Tags';
import { Comments } from '@/pages/admin/Comments';
import { Media } from '@/pages/admin/Media';
import { AI } from '@/pages/admin/AI';
import { Settings } from '@/pages/admin/Settings';
import { Pages } from '@/pages/admin/Pages';
import { PageEdit } from '@/pages/admin/PageEdit';
import { Users } from '@/pages/admin/Users';
import { Page } from '@/pages/Page';
import { Legal } from '@/pages/Legal';

function App() {
  return (
    <BrowserRouter>
      <SettingsProvider>
        <LegalSheetProvider>
          <LinkPreviewSheetProvider>
            <ScrollToTop />
            <Toaster />
            <Routes>
          {/* Public routes */}
          <Route path="/" element={<Home />} />
          <Route path="/post/:slug" element={<Post />} />
          <Route path="/category/:slug" element={<Category />} />
          <Route path="/tag/:slug" element={<Tag />} />
          <Route path="/search" element={<Search />} />
          <Route path="/login" element={<Login />} />
          <Route path="/legal/:slug" element={<Legal />} />

          {/* Admin routes */}
          <Route path="/admin" element={<Dashboard />} />
          <Route path="/admin/posts" element={<Posts />} />
          <Route path="/admin/posts/new" element={<PostEdit />} />
          <Route path="/admin/posts/:id/edit" element={<PostEdit />} />
          <Route path="/admin/categories" element={<Categories />} />
          <Route path="/admin/tags" element={<Tags />} />
          <Route path="/admin/comments" element={<Comments />} />
          <Route path="/admin/media" element={<Media />} />
          <Route path="/admin/ai" element={<AI />} />
          <Route path="/admin/settings" element={<Settings />} />
          <Route path="/admin/pages" element={<Pages />} />
          <Route path="/admin/users" element={<Users />} />
          <Route path="/admin/pages/new" element={<PageEdit />} />
          <Route path="/admin/pages/:id/edit" element={<PageEdit />} />

          {/* Public page route - must be last */}
          <Route path="/page/:slug" element={<Page />} />
            </Routes>
          </LinkPreviewSheetProvider>
        </LegalSheetProvider>
      </SettingsProvider>
    </BrowserRouter>
  );
}

export default App;
