import { useState, useEffect } from 'react';
import { AdminLayout } from '@/components/layout/AdminLayout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { useApi, useApiMutation } from '@/hooks/useApi';
import { toast } from 'sonner';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';

const FONT_OPTIONS = [
  { value: 'system-ui', label: 'System Default' },
  { value: 'Inter', label: 'Inter' },
  { value: 'Roboto', label: 'Roboto' },
  { value: 'Open Sans', label: 'Open Sans' },
  { value: 'Lato', label: 'Lato' },
  { value: 'Poppins', label: 'Poppins' },
  { value: 'Playfair Display', label: 'Playfair Display' },
  { value: 'Merriweather', label: 'Merriweather' },
];

const COLOR_PRESETS = [
  { name: 'Default', primary: '240 5.9% 10%', accent: '210 40% 96.1%' },
  { name: 'Blue', primary: '221.2 83.2% 53.3%', accent: '210 40% 96.1%' },
  { name: 'Green', primary: '142.1 76.2% 36.3%', accent: '143 64% 96%' },
  { name: 'Purple', primary: '262.1 83.3% 57.8%', accent: '270 80% 96%' },
  { name: 'Orange', primary: '24.6 95% 53.1%', accent: '30 100% 96%' },
  { name: 'Red', primary: '0 72.2% 50.6%', accent: '0 60% 96%' },
];

const SURFACE_PRESETS = [
  { name: 'Theme default', bg: null as string | null, fg: null as string | null },
  { name: 'Light', bg: '0 0% 100%', fg: '222.2 84% 4.9%' },
  { name: 'Muted', bg: '210 40% 96.1%', fg: '222.2 47.4% 11.2%' },
  { name: 'Dark', bg: '222.2 84% 4.9%', fg: '210 40% 98%' },
] as const

export function Settings() {
  const { data: settingsRows } = useApi<Array<{ key: string; value: string }>>('/settings');
  const { mutate, isLoading, error } = useApiMutation();

  const [siteName, setSiteName] = useState('');
  const [siteDescription, setSiteDescription] = useState('');
  const [siteUrl, setSiteUrl] = useState('');
  const [postsPerPage, setPostsPerPage] = useState('10');
  const [allowComments, setAllowComments] = useState(true);
  const [moderateComments, setModerateComments] = useState(true);

  // Theme settings
  const [primaryColor, setPrimaryColor] = useState('240 5.9% 10%');
  const [accentColor, setAccentColor] = useState('210 40% 96.1%');
  const [headingFont, setHeadingFont] = useState('system-ui');
  const [bodyFont, setBodyFont] = useState('system-ui');
  const [logoUrl, setLogoUrl] = useState('');
  const [faviconUrl, setFaviconUrl] = useState('');
  const [headerBgColor, setHeaderBgColor] = useState('')
  const [headerTextColor, setHeaderTextColor] = useState('')
  const [footerBgColor, setFooterBgColor] = useState('')
  const [footerTextColor, setFooterTextColor] = useState('')

  useEffect(() => {
    if (settingsRows && Array.isArray(settingsRows)) {
      const parsed: Record<string, any> = {};
      for (const row of settingsRows) {
        try {
          parsed[row.key] = JSON.parse(row.value);
        } catch {
          parsed[row.key] = row.value;
        }
      }

      setSiteName(parsed.siteName || '');
      setSiteDescription(parsed.siteDescription || '');
      setSiteUrl(parsed.siteUrl || '');
      setPostsPerPage((parsed.postsPerPage ?? 10).toString());
      setAllowComments(parsed.allowComments ?? true);
      setModerateComments(parsed.moderateComments ?? true);
      // Theme settings
      setPrimaryColor(parsed.primaryColor || '240 5.9% 10%');
      setAccentColor(parsed.accentColor || '210 40% 96.1%');
      setHeadingFont(parsed.headingFont || 'system-ui');
      setBodyFont(parsed.bodyFont || 'system-ui');
      setLogoUrl(parsed.logoUrl || '');
      setFaviconUrl(parsed.faviconUrl || '');
      setHeaderBgColor(typeof parsed.headerBgColor === 'string' ? parsed.headerBgColor : '')
      setHeaderTextColor(typeof parsed.headerTextColor === 'string' ? parsed.headerTextColor : '')
      setFooterBgColor(typeof parsed.footerBgColor === 'string' ? parsed.footerBgColor : '')
      setFooterTextColor(typeof parsed.footerTextColor === 'string' ? parsed.footerTextColor : '')
    }
  }, [settingsRows]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const result = await mutate('/settings', {
      siteName,
      siteDescription,
      siteUrl,
      postsPerPage: parseInt(postsPerPage),
      allowComments,
      moderateComments,
      primaryColor,
      accentColor,
      headingFont,
      bodyFont,
      logoUrl,
      faviconUrl,
      headerBgColor: headerBgColor.trim() ? headerBgColor.trim() : null,
      headerTextColor: headerTextColor.trim() ? headerTextColor.trim() : null,
      footerBgColor: footerBgColor.trim() ? footerBgColor.trim() : null,
      footerTextColor: footerTextColor.trim() ? footerTextColor.trim() : null,
    }, 'PUT');

    if (result) {
      toast.success('Settings saved')
    }
  };

  const applyColorPreset = (preset: typeof COLOR_PRESETS[0]) => {
    setPrimaryColor(preset.primary);
    setAccentColor(preset.accent);
  };

  const headerPreviewBg = headerBgColor.trim() ? `hsl(${headerBgColor})` : 'hsl(var(--background))'
  const headerPreviewFg = headerTextColor.trim() ? `hsl(${headerTextColor})` : 'hsl(var(--foreground))'
  const footerPreviewBg = footerBgColor.trim() ? `hsl(${footerBgColor})` : 'hsl(var(--background))'
  const footerPreviewFg = footerTextColor.trim() ? `hsl(${footerTextColor})` : 'hsl(var(--foreground))'

  return (
    <AdminLayout>
      <div className="space-y-6 max-w-4xl">
        <div>
          <h1 className="text-3xl font-bold">Settings</h1>
          <p className="text-muted-foreground">
            Configure your blog settings
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>General Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="siteName">Site Name</Label>
                <Input
                  id="siteName"
                  value={siteName}
                  onChange={(e) => setSiteName(e.target.value)}
                  placeholder="My Awesome Blog"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="siteDescription">Site Description</Label>
                <Textarea
                  id="siteDescription"
                  value={siteDescription}
                  onChange={(e) => setSiteDescription(e.target.value)}
                  placeholder="A brief description of your blog"
                  rows={3}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="siteUrl">Site URL</Label>
                <Input
                  id="siteUrl"
                  type="url"
                  value={siteUrl}
                  onChange={(e) => setSiteUrl(e.target.value)}
                  placeholder="https://example.com"
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Content Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="postsPerPage">Posts Per Page</Label>
                <Input
                  id="postsPerPage"
                  type="number"
                  min="1"
                  max="100"
                  value={postsPerPage}
                  onChange={(e) => setPostsPerPage(e.target.value)}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Comment Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="allowComments"
                  checked={allowComments}
                  onCheckedChange={(v) => setAllowComments(Boolean(v))}
                />
                <Label htmlFor="allowComments" className="cursor-pointer">
                  Allow comments on posts
                </Label>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="moderateComments"
                  checked={moderateComments}
                  onCheckedChange={(v) => setModerateComments(Boolean(v))}
                />
                <Label htmlFor="moderateComments" className="cursor-pointer">
                  Moderate comments before publishing
                </Label>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Theme Customization</CardTitle>
              <CardDescription>Customize the look and feel of your blog</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="logoUrl">Logo URL</Label>
                <Input
                  id="logoUrl"
                  value={logoUrl}
                  onChange={(e) => setLogoUrl(e.target.value)}
                  placeholder="https://example.com/logo.png"
                />
                {logoUrl && (
                  <div className="mt-2">
                    <img src={logoUrl} alt="Logo preview" className="h-12 object-contain" />
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="faviconUrl">Favicon URL</Label>
                <Input
                  id="faviconUrl"
                  value={faviconUrl}
                  onChange={(e) => setFaviconUrl(e.target.value)}
                  placeholder="https://example.com/favicon.png"
                />
                {faviconUrl && (
                  <div className="mt-2 flex items-center gap-2">
                    <img src={faviconUrl} alt="Favicon preview" className="h-8 w-8 object-contain" />
                    <div className="text-sm text-muted-foreground">Used for browser tab and app icons.</div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <Label>Color Presets</Label>
                <div className="flex flex-wrap gap-2">
                  {COLOR_PRESETS.map((preset) => (
                    <Button
                      key={preset.name}
                      type="button"
                      onClick={() => applyColorPreset(preset)}
                      variant="outline"
                      size="sm"
                      className="min-h-0"
                      style={{
                        borderColor: `hsl(${preset.primary})`,
                        color: `hsl(${preset.primary})`,
                      }}
                    >
                      {preset.name}
                    </Button>
                  ))}
                </div>
              </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="primaryColor">Primary Color (HSL)</Label>
                    <div className="flex gap-2">
                    <Input
                      id="primaryColor"
                      value={primaryColor}
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      placeholder="222.2 47.4% 11.2%"
                    />
                    <div
                      className="w-10 h-10 rounded border"
                      style={{ backgroundColor: `hsl(${primaryColor})` }}
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="accentColor">Accent Color (HSL)</Label>
                  <div className="flex gap-2">
                    <Input
                      id="accentColor"
                      value={accentColor}
                      onChange={(e) => setAccentColor(e.target.value)}
                      placeholder="210 40% 96.1%"
                    />
                    <div
                      className="w-10 h-10 rounded border"
                      style={{ backgroundColor: `hsl(${accentColor})` }}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="headingFont">Heading Font</Label>
                  <Select value={headingFont} onValueChange={setHeadingFont}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a font" />
                    </SelectTrigger>
                    <SelectContent>
                      {FONT_OPTIONS.map((font) => (
                        <SelectItem key={font.value} value={font.value}>
                          {font.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="bodyFont">Body Font</Label>
                  <Select value={bodyFont} onValueChange={setBodyFont}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a font" />
                    </SelectTrigger>
                    <SelectContent>
                      {FONT_OPTIONS.map((font) => (
                        <SelectItem key={font.value} value={font.value}>
                          {font.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                </div>

              <div className="border-t pt-6 space-y-4">
                <div className="space-y-1">
                  <h3 className="text-base font-semibold">Header & Footer</h3>
                  <p className="text-sm text-muted-foreground">
                    Customize background and text colors for your public header/footer.
                  </p>
                </div>

                <Tabs defaultValue="header">
                  <TabsList>
                    <TabsTrigger value="header">Header</TabsTrigger>
                    <TabsTrigger value="footer">Footer</TabsTrigger>
                  </TabsList>

                  <TabsContent value="header" className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {SURFACE_PRESETS.map((preset) => (
                        <Button
                          key={preset.name}
                          type="button"
                          variant="outline"
                          size="sm"
                          className="min-h-0"
                          onClick={() => {
                            setHeaderBgColor(preset.bg || '')
                            setHeaderTextColor(preset.fg || '')
                          }}
                        >
                          {preset.name}
                        </Button>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="headerBgColor">Header background (HSL)</Label>
                        <div className="flex gap-2">
                          <Input
                            id="headerBgColor"
                            value={headerBgColor}
                            onChange={(e) => setHeaderBgColor(e.target.value)}
                            placeholder="(leave empty for theme default)"
                          />
                          <div className="w-10 h-10 rounded border" style={{ backgroundColor: headerPreviewBg }} />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="headerTextColor">Header text (HSL)</Label>
                        <div className="flex gap-2">
                          <Input
                            id="headerTextColor"
                            value={headerTextColor}
                            onChange={(e) => setHeaderTextColor(e.target.value)}
                            placeholder="(leave empty for theme default)"
                          />
                          <div className="w-10 h-10 rounded border" style={{ backgroundColor: headerPreviewFg }} />
                        </div>
                      </div>
                    </div>
                  </TabsContent>

                  <TabsContent value="footer" className="space-y-4">
                    <div className="flex flex-wrap gap-2">
                      {SURFACE_PRESETS.map((preset) => (
                        <Button
                          key={preset.name}
                          type="button"
                          variant="outline"
                          size="sm"
                          className="min-h-0"
                          onClick={() => {
                            setFooterBgColor(preset.bg || '')
                            setFooterTextColor(preset.fg || '')
                          }}
                        >
                          {preset.name}
                        </Button>
                      ))}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="footerBgColor">Footer background (HSL)</Label>
                        <div className="flex gap-2">
                          <Input
                            id="footerBgColor"
                            value={footerBgColor}
                            onChange={(e) => setFooterBgColor(e.target.value)}
                            placeholder="(leave empty for theme default)"
                          />
                          <div className="w-10 h-10 rounded border" style={{ backgroundColor: footerPreviewBg }} />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="footerTextColor">Footer text (HSL)</Label>
                        <div className="flex gap-2">
                          <Input
                            id="footerTextColor"
                            value={footerTextColor}
                            onChange={(e) => setFooterTextColor(e.target.value)}
                            placeholder="(leave empty for theme default)"
                          />
                          <div className="w-10 h-10 rounded border" style={{ backgroundColor: footerPreviewFg }} />
                        </div>
                      </div>
                    </div>
                  </TabsContent>
                </Tabs>

                <div className="rounded-md border overflow-hidden">
                  <div style={{ backgroundColor: headerPreviewBg, color: headerPreviewFg }} className="px-4 py-3">
                    <div className="flex items-center justify-between">
                      <div className="font-semibold">Header preview</div>
                      <div className="text-sm opacity-70">
                        Links · Search · Menu
                      </div>
                    </div>
                  </div>
                  <div className="px-4 py-4 bg-background text-foreground">
                    <div className="text-sm text-muted-foreground">Page content preview</div>
                  </div>
                  <div style={{ backgroundColor: footerPreviewBg, color: footerPreviewFg }} className="px-4 py-3">
                    <div className="text-sm">Footer preview</div>
                  </div>
                </div>
              </div>

              <div className="p-4 border rounded-md bg-card">
                <h4 className="font-semibold mb-2" style={{ fontFamily: headingFont }}>
                  Preview: Heading Style
                </h4>
                <p style={{ fontFamily: bodyFont }}>
                  This is how your body text will look with the selected fonts.
                </p>
              </div>
            </CardContent>
          </Card>

          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-4 rounded-md">
              {error.message}
            </div>
          )}

          <Button type="submit" disabled={isLoading}>
            {isLoading ? 'Saving...' : 'Save Settings'}
          </Button>
        </form>
      </div>
    </AdminLayout>
  );
}
