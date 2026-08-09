'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { motion } from 'framer-motion'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Avatar } from '@/components/ui/avatar'
import { Icons } from '@/components/ui/icons'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
}

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
}

const TOGGLE_STORAGE_PREFIX = 'settings-toggle-'

function usePersistedToggle(id: string, defaultChecked: boolean): [boolean, (v: boolean) => void] {
  const [checked, setChecked] = useState(defaultChecked)

  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(TOGGLE_STORAGE_PREFIX + id)
      if (stored !== null) setChecked(stored === 'true')
    } catch {
      // localStorage unavailable — falls back to the default for this session
    }
  }, [id])

  const update = (v: boolean) => {
    setChecked(v)
    try {
      window.localStorage.setItem(TOGGLE_STORAGE_PREFIX + id, String(v))
    } catch {
      // localStorage unavailable — change still applies for this session
    }
  }

  return [checked, update]
}

function SettingToggle({
  id,
  label,
  description,
  defaultChecked = false,
}: {
  id: string
  label: string
  description: string
  defaultChecked?: boolean
}) {
  const [checked, setChecked] = usePersistedToggle(id, defaultChecked)

  return (
    <div className='flex items-center justify-between py-3'>
      <div className='space-y-0.5'>
        <Label htmlFor={id} className='text-sm font-medium text-foreground cursor-pointer'>
          {label}
        </Label>
        <p className='text-xs text-muted-foreground'>{description}</p>
      </div>
      <Switch
        id={id}
        checked={checked}
        onCheckedChange={setChecked}
      />
    </div>
  )
}

export default function SettingsPage() {
  const { data: session } = useSession()
  const router = useRouter()
  const quickSettingsRef = useRef<HTMLDivElement>(null)

  return (
    <motion.div
      className='space-y-8'
      variants={containerVariants}
      initial='hidden'
      animate='visible'
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className='text-display-3 font-bold tracking-tight text-brand-navy'>
          Settings
        </h1>
        <p className='mt-2 text-lg text-muted-foreground'>
          Manage your account and application preferences.
        </p>
      </motion.div>

      {/* Profile Section */}
      <motion.div variants={itemVariants}>
        <Card>
          <CardHeader>
            <CardTitle>Profile</CardTitle>
            <CardDescription>Your personal information</CardDescription>
          </CardHeader>
          <CardContent>
            <div className='flex items-center gap-6'>
              <Avatar
                src={session?.user?.image}
                fallback={session?.user?.name || session?.user?.email || '?'}
                size='lg'
                showRing
              />
              <div className='flex-1'>
                <h3 className='text-lg font-semibold text-foreground'>
                  {session?.user?.name || 'User'}
                </h3>
                <p className='text-sm text-muted-foreground'>
                  {session?.user?.email}
                </p>
                <p className='mt-1 text-xs text-muted-foreground'>
                  PulseWise Developer
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Settings Grid */}
      <div className='grid gap-6 md:grid-cols-2'>
        <motion.div variants={itemVariants}>
          <Card className='h-full'>
            <CardHeader>
              <div className='flex items-center gap-3'>
                <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-brand-cornflower/10'>
                  <Icons.bell className='h-5 w-5 text-brand-cornflower' strokeWidth={1.5} />
                </div>
                <div>
                  <CardTitle className='text-base'>Notifications</CardTitle>
                  <CardDescription className='text-xs'>Manage how you receive notifications</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button
                variant='ghost'
                className='w-full justify-between'
                onClick={() => quickSettingsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
              >
                Configure
                <Icons.chevronRight className='h-4 w-4' />
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div variants={itemVariants}>
          <Card className='h-full'>
            <CardHeader>
              <div className='flex items-center gap-3'>
                <div className='flex h-10 w-10 items-center justify-center rounded-lg bg-brand-cornflower/10'>
                  <Icons.share className='h-5 w-5 text-brand-cornflower' strokeWidth={1.5} />
                </div>
                <div>
                  <CardTitle className='text-base'>Integrations</CardTitle>
                  <CardDescription className='text-xs'>Connected apps and services</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <Button
                variant='ghost'
                className='w-full justify-between'
                onClick={() => router.push('/data-manager')}
              >
                Configure
                <Icons.chevronRight className='h-4 w-4' />
              </Button>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Quick Settings */}
      <motion.div variants={itemVariants} ref={quickSettingsRef}>
        <Card>
          <CardHeader>
            <CardTitle>Quick Settings</CardTitle>
            <CardDescription>
              Common settings you can toggle quickly — saved on this device
            </CardDescription>
          </CardHeader>
          <CardContent className='divide-y divide-border'>
            <SettingToggle
              id='email-notifications'
              label='Email Notifications'
              description='Receive email notifications for important updates'
              defaultChecked={true}
            />
            <SettingToggle
              id='desktop-notifications'
              label='Desktop Notifications'
              description='Show desktop notifications when the app is open'
              defaultChecked={true}
            />
            <SettingToggle
              id='weekly-digest'
              label='Weekly Digest'
              description='Receive a weekly summary of your activity'
              defaultChecked={false}
            />
            <SettingToggle
              id='marketing-emails'
              label='Marketing Emails'
              description='Receive product updates and announcements'
              defaultChecked={false}
            />
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  )
}
