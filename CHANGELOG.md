# Changelog

## [1.2.0] - 2025-11-26

### Changed
- **Stable Layout**: Fixed button and cart resizing issues
  - Product buttons now fixed at 140px × 120px
  - Product grid uses fixed sizing instead of flexible
  - Cart maintains consistent height regardless of items
  - Cart total and action buttons stay fixed at bottom
  - Only cart items area scrolls when overflow
  - No layout shifts when adding/removing items

### Improved
- Better touch experience with consistent tap targets
- Professional, polished feel with stable interface
- Muscle memory development from fixed button positions

## [1.1.0] - 2025-11-26

### Added
- **Change Account Button**: Users can now change accounts without completing a transaction
  - "Change Account" button appears in header when an account is selected
  - Opens account selector modal to choose a different account
  - Maintains cart contents when switching accounts

- **Auto-Clear After Checkout**: Enhanced security and workflow
  - Account selection automatically clears after successful checkout
  - Cart automatically clears after successful checkout
  - Products become disabled after checkout
  - Prevents accidental charges to wrong accounts
  - Forces intentional account selection for each transaction

### Changed
- Improved account display in header with better layout
- Account info now shows both name and balance prominently
- Change Account button styled to match header design

### Fixed
- Account field name mismatch (account_name vs name)
- Missing transaction_type in checkout requests
- Response structure handling for balance updates

## [1.0.0] - 2025-11-26

### Initial Release
- Touch-first, tablet-optimized POS interface
- Account selection with search functionality
- Product catalog organized by categories
- Shopping cart with quantity adjustment
- Checkout processing with immediate account updates
- Transaction history storage
- Real-time balance updates
- WebSocket support for multi-device sync
- SQLite database backend
- RESTful API

### Features
- No keyboard required for daily operations
- Large touch targets (44px minimum)
- No scrolling required on tablet screens
- Simple, focused interface
- Immediate transaction recording
- Complete audit trail

### Categories
- Candy (Chocolate Bar, Gummy Bears, Skittles)
- Soda (Coca-Cola, Sprite, Root Beer)
- Drinks (Water, Gatorade, Juice Box)
- Hot Food (Hamburger, Hot Dog)
