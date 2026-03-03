# Testing Checklist

Use this checklist to verify all features are working correctly.

## Setup
- [ ] Run `pnpm install`
- [ ] Run `pnpm dev`
- [ ] Open http://localhost:3000
- [ ] No console errors

---

## Landing Page
- [ ] Landing page displays
- [ ] Feature cards are visible
- [ ] "Get Started" button works
- [ ] "Sign In" button works
- [ ] Demo credentials notice visible

---

## Authentication

### Sign Up Flow
- [ ] Navigate to signup page
- [ ] Email field accepts valid email
- [ ] Username field has max 100 chars
- [ ] Password field requires min 8 chars
- [ ] Role selector shows all 3 options
- [ ] Form validates before submit
- [ ] Signup button disabled when loading
- [ ] Success redirects to verify email
- [ ] Error message displays for duplicate email
- [ ] "Back to login" link works

### Email Verification
- [ ] Email verification page loads
- [ ] Token input accepts text
- [ ] "Verify Email" button works
- [ ] Any 5+ char token succeeds
- [ ] Success message displays
- [ ] Redirects to login after success
- [ ] "Back to login" link works

### Login Flow
- [ ] Navigate to login page
- [ ] Email pre-filled with demo account
- [ ] Password field has correct type
- [ ] Form validates empty fields
- [ ] Login succeeds with correct credentials
- [ ] Login fails with wrong password
- [ ] Error message displays for wrong credentials
- [ ] "Forgot password?" link works
- [ ] "Create account" link works
- [ ] Submit button shows loading state

### Forgot Password
- [ ] Page loads correctly
- [ ] Email field validates
- [ ] Submit button sends
- [ ] Success message shows
- [ ] Displays user's email
- [ ] "Back to login" link works

### Reset Password
- [ ] Page loads correctly
- [ ] Token field accepts input
- [ ] Password fields validate min 8 chars
- [ ] Confirm password must match
- [ ] Error shows if passwords don't match
- [ ] Success redirects to login
- [ ] "Back to login" link works

---

## Workspace Layout

### Top Bar
- [ ] Logo and "NotebookLM" visible
- [ ] User avatar shows initial letter
- [ ] Left arrow button (sidebar toggle) present
- [ ] Right arrow button (chat toggle) present
- [ ] User dropdown works

### User Menu
- [ ] Click avatar opens dropdown
- [ ] Shows username and email
- [ ] "Profile" link navigates correctly
- [ ] "Settings" link navigates correctly
- [ ] "Sign Out" logs out and redirects

### Left Sidebar
- [ ] "My Documents" header visible
- [ ] "New folder..." input visible
- [ ] "+" button creates folder
- [ ] Folders list displays
- [ ] "My Documents" folder is selected by default
- [ ] Clicking folder highlights it
- [ ] Files list shows under selected folder
- [ ] Folder count matches demo data
- [ ] Files show correct icons

### Folder Management
- [ ] Type folder name in input
- [ ] Press Enter creates folder
- [ ] Click "+" button creates folder
- [ ] New folder appears in list
- [ ] Folder is selectable
- [ ] Files reload when folder changes
- [ ] Empty folder shows no files

### File Management
- [ ] Files list shows all files in folder
- [ ] File icons display correctly
- [ ] Clicking file highlights it
- [ ] File count matches backend data
- [ ] Files sorted by creation date

### Center Panel (PDF Viewer)
- [ ] Toolbar shows file name
- [ ] Toolbar shows file size
- [ ] "Download" button present
- [ ] "Share" button present
- [ ] PDF icon visible in viewport
- [ ] File name displays in viewport
- [ ] Placeholder text shows
- [ ] Empty state when no file selected

### Right Chat Panel
- [ ] Chat header visible
- [ ] "Chat" title displays
- [ ] Settings icon present
- [ ] Message list empty initially (except system message)
- [ ] AI model dropdown shows options
- [ ] Message input visible
- [ ] "Send" button present
- [ ] Character count not visible (not at limit)

### Panel Toggles
- [ ] Left arrow button toggles sidebar open/close
- [ ] Right arrow button toggles chat open/close
- [ ] Sidebar width changes on toggle
- [ ] Chat panel width changes on toggle
- [ ] Content resizes appropriately

### Responsive Design
- [ ] Resize window to tablet width
- [ ] Resize window to mobile width
- [ ] Sidebar/chat toggles on mobile
- [ ] Content still readable
- [ ] No horizontal scrollbars

---

## Chat Functionality

### Initial Load
- [ ] Chatroom created when file selected
- [ ] Welcome message shows
- [ ] Message from "NotebookLM" displays
- [ ] Correct file in context

### Send Message
- [ ] Type message in textarea
- [ ] Click "Send" button
- [ ] Message appears immediately
- [ ] Message shows "You" as sender
- [ ] Message has timestamp
- [ ] Message shows on right side
- [ ] Textarea clears after send

### Keyboard Shortcut
- [ ] Type message
- [ ] Press Ctrl+Enter
- [ ] Message sends

### AI Response
- [ ] AI response appears after delay
- [ ] Shows "NotebookLM" as sender
- [ ] Shows on left side
- [ ] Has timestamp
- [ ] Simulates response content

### Model Selection
- [ ] Dropdown shows all 3 models
- [ ] Can select different models
- [ ] Selection persists until changed
- [ ] Messages sent with selected model

### Auto-Scroll
- [ ] Messages scroll to bottom automatically
- [ ] Latest message visible
- [ ] No manual scrolling needed

### Empty State
- [ ] "No messages" shows when file deselected
- [ ] Empty state text appropriate

---

## Profile Page

### View Profile
- [ ] Navigate to profile from menu
- [ ] User name displays correctly
- [ ] User email displays
- [ ] Reputation score shows
- [ ] Completion score shows
- [ ] Account information section displays
- [ ] University information section displays
- [ ] Email field populated
- [ ] Username field populated
- [ ] Role shows correctly
- [ ] Status shows correctly
- [ ] All profile fields display

### Edit Button
- [ ] "Edit Profile" button navigates correctly
- [ ] Button present and clickable

### Profile Links
- [ ] "Back" button works
- [ ] Can navigate away and back

---

## Edit Profile Page

### Form Fields
- [ ] First name input visible
- [ ] Last name input visible
- [ ] University ID input visible
- [ ] Department input visible
- [ ] Bio textarea visible
- [ ] Visibility dropdown visible
- [ ] All fields populate with current data

### Validation
- [ ] First name max 100 chars
- [ ] Last name max 100 chars
- [ ] University ID max 50 chars
- [ ] Department max 100 chars
- [ ] Bio shows character count
- [ ] Bio max 2000 chars
- [ ] Character counter updates

### Visibility Options
- [ ] Dropdown shows 3 options
- [ ] Can select each option
- [ ] Current selection shows

### Save
- [ ] Click "Save Changes" submits
- [ ] Loading state shows during save
- [ ] Button disabled while saving
- [ ] Success message displays
- [ ] Redirects to profile page
- [ ] Data persists (on refresh/navigate back)

### Cancel
- [ ] "Cancel" button works
- [ ] Returns to profile
- [ ] No data saved

### Error Handling
- [ ] Error message displays on failure
- [ ] Can retry after error

---

## Settings Page

### Page Load
- [ ] Settings page loads
- [ ] All sections visible
- [ ] "Back to Workspace" button present

### Notifications Section
- [ ] Email notifications toggle present
- [ ] File activity notifications toggle present
- [ ] Toggles are interactive (no persistence needed)

### Privacy & Security
- [ ] "Manage Profile Visibility" button present
- [ ] Navigates to edit profile

### Workspace Section
- [ ] Sidebar toggle present
- [ ] Chat panel toggle present
- [ ] Toggles are interactive

### About Section
- [ ] Version displayed
- [ ] App name correct
- [ ] Demo notice visible

---

## Navigation & Routing

### Route Protection
- [ ] Direct access to `/app/workspace` without login redirects to `/auth/login`
- [ ] Direct access to `/app/profile` without login redirects
- [ ] Cannot access protected routes while logged out

### Login Redirect
- [ ] After login, redirects to `/app/workspace`
- [ ] Page does not show loading indefinitely

### Logout
- [ ] Sign out returns to landing page
- [ ] Session cleared (can't access protected routes)
- [ ] Requires re-login to access workspace

### Navigation Links
- [ ] All internal links work
- [ ] No 404 errors
- [ ] Breadcrumb navigation logical

---

## Error States

### Loading States
- [ ] Spinner shows while loading
- [ ] Text updates with action
- [ ] Disappears when complete

### Empty States
- [ ] "No Folders" message when appropriate
- [ ] "No Files" message when appropriate
- [ ] "No Messages" message in chat
- [ ] "No File Selected" in main area
- [ ] Icons and descriptions clear

### Error Messages
- [ ] Form validation errors display
- [ ] API error messages show clearly
- [ ] Errors are dismissible or clear after action

---

## Performance

### Load Time
- [ ] Landing page loads quickly
- [ ] Auth pages load immediately
- [ ] Workspace loads without lag
- [ ] Chat loads smoothly

### Interactions
- [ ] Button clicks respond immediately
- [ ] Folder selection updates instantly
- [ ] File selection updates instantly
- [ ] No janky animations or delays

---

## Accessibility

### Keyboard Navigation
- [ ] Tab through form fields
- [ ] Tab to buttons
- [ ] Enter submits forms
- [ ] Esc closes modals (if any)

### Focus Indicators
- [ ] Focused elements are visible
- [ ] Focus ring appears on buttons
- [ ] Focus visible on links

### Color Contrast
- [ ] Text readable on background
- [ ] Error messages stand out
- [ ] Links distinguishable

---

## Visual Consistency

### Styling
- [ ] Consistent spacing throughout
- [ ] Consistent font sizes
- [ ] Consistent colors
- [ ] Rounded corners consistent

### Dark Mode (if enabled)
- [ ] Light mode works correctly
- [ ] Dark mode works correctly
- [ ] Toggle switches modes
- [ ] Contrast maintained in both

### Components
- [ ] Buttons have consistent styling
- [ ] Inputs have consistent styling
- [ ] Cards have consistent styling
- [ ] Spacing between elements consistent

---

## Edge Cases

### Empty Data
- [ ] App works with no folders created
- [ ] App works with no files
- [ ] Chat works with no messages
- [ ] Profile works as new user

### Form Edge Cases
- [ ] Very long names render correctly
- [ ] Spaces in inputs handled correctly
- [ ] Special characters handled correctly
- [ ] Whitespace trimmed correctly

### Quick Actions
- [ ] Creating folder then immediately selecting file works
- [ ] Sending message while another loads
- [ ] Rapid button clicks handled

### Session Management
- [ ] Logout clears session
- [ ] Page refresh maintains session (if using storage)
- [ ] Token refresh works (if implemented)

---

## Browser Compatibility

- [ ] Chrome/Edge works
- [ ] Firefox works
- [ ] Safari works
- [ ] Mobile Safari works

---

## Final Verification

- [ ] No console errors or warnings
- [ ] No broken images
- [ ] All links work
- [ ] Form submissions work
- [ ] Data persists correctly
- [ ] Performance is acceptable
- [ ] Mobile responsive
- [ ] Accessibility acceptable

---

## Sign-Off

**Tested By:** _________________
**Date:** _________________
**Environment:** Local / Staging / Production

**Status:**
- [ ] All tests passed
- [ ] Tests passed with notes (see below)
- [ ] Some tests failed (see below)

**Notes:**
```
(Add any notes, issues, or observations here)
```

---

**Remember:** This is a skeleton/demo. Mock data clears on refresh. No data persistence.
