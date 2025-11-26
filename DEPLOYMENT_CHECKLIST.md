# Camp Snack Bar POS - Deployment Checklist

Use this checklist to ensure a smooth deployment and operation of the Camp Snack Bar POS system.

---

## 📦 Pre-Deployment (1-2 Weeks Before Camp)

### Hardware Preparation
- [ ] Raspberry Pi 4 (4GB+ RAM) obtained and tested
- [ ] 16GB+ microSD card purchased and formatted
- [ ] Power supply for Raspberry Pi (official recommended)
- [ ] Ethernet cable (optional but recommended for initial setup)
- [ ] Router/WiFi access point configured
- [ ] 2-3 tablets obtained (Android 8.0+ or iOS 12+)
- [ ] Tablet cases/stands for snack bar setup
- [ ] Power strips and charging cables for all devices

### Software Installation
- [ ] Raspberry Pi OS flashed to microSD card
- [ ] SSH enabled on Raspberry Pi
- [ ] WiFi credentials configured (if not using Ethernet)
- [ ] Docker installed on Raspberry Pi
- [ ] Docker Compose installed
- [ ] Application files transferred to Pi
- [ ] Docker containers built successfully
- [ ] Application accessible from Pi's browser

### Network Configuration
- [ ] Raspberry Pi assigned static IP address
- [ ] Static IP documented (write it down!)
- [ ] Router DHCP reservation created for Pi
- [ ] Client isolation DISABLED on WiFi
- [ ] Port 5000 verified open on Pi firewall
- [ ] Network tested from multiple tablets
- [ ] WiFi password documented for staff

### Application Configuration
- [ ] Admin password changed from default `camp2024`
- [ ] New admin password documented securely
- [ ] Database initialized with schema
- [ ] Test accounts created (at least 3)
- [ ] Test products added (at least 10)
- [ ] Test transactions completed successfully
- [ ] Backup system tested (manual backup created)
- [ ] Auto-start service enabled and tested
- [ ] Raspberry Pi reboot tested (system auto-starts)

---

## 🍬 Initial Setup (Day Before Camp Starts)

### Product Setup
- [ ] All snack bar products added to system
- [ ] Product categories configured (Candy, Soda, Drinks, Food)
- [ ] Prices verified and accurate
- [ ] Inventory counts entered (if using inventory tracking)
- [ ] Product list printed as reference

### Account Setup
- [ ] Camper/family list obtained from camp administration
- [ ] All accounts created in system
- [ ] Account types set (individual vs family)
- [ ] Prepaid amounts entered (if families paid in advance)
- [ ] Account list printed for reference
- [ ] Account search tested with common names

### Tablet Configuration
- [ ] All tablets connected to camp WiFi
- [ ] Browser bookmarks created pointing to: `http://[PI-IP]:5000`
- [ ] "Add to Home Screen" completed on all tablets
- [ ] Full screen mode enabled
- [ ] Screen sleep disabled or set to maximum
- [ ] Test transactions completed on each tablet
- [ ] Tablets charged to 100%
- [ ] Tablet charging stations set up at snack bar

### Staff Training
- [ ] Admin staff trained on system basics
- [ ] POS staff trained on checkout process
- [ ] Account lookup process demonstrated
- [ ] Transaction completion practiced
- [ ] Error handling procedures reviewed
- [ ] Admin panel features explained
- [ ] Backup procedure demonstrated
- [ ] Quick reference guide printed and posted

---

## 🏕️ Day 1 - Camp Starts

### Morning Setup
- [ ] Raspberry Pi powered on and accessible
- [ ] All tablets powered on and connected
- [ ] Application loads correctly on all tablets
- [ ] Test transaction completed
- [ ] Staff reminded of login procedures
- [ ] Admin password reminder available to supervisors only
- [ ] Quick reference guides posted at POS stations

### First Transactions
- [ ] First real transaction completed successfully
- [ ] Receipt verified accurate
- [ ] Account balance updated correctly
- [ ] Transaction logged in system
- [ ] Staff comfortable with process

### End of Day 1
- [ ] Manual backup created
- [ ] Transaction totals reviewed
- [ ] Any issues documented
- [ ] Staff feedback collected
- [ ] Adjustments made if needed

---

## 📊 Daily Operations

### Morning Routine
- [ ] Verify Raspberry Pi is running
- [ ] Check all tablets are online
- [ ] Review previous day's transactions
- [ ] Check for any negative balances
- [ ] Verify inventory levels (if tracking)

### Throughout the Day
- [ ] Monitor system performance
- [ ] Respond to staff questions
- [ ] Handle any account issues
- [ ] Update product availability if items sell out
- [ ] Check tablet battery levels

### End of Day Routine
- [ ] Create manual backup
- [ ] Export daily report
- [ ] Review transaction summary
- [ ] Identify top-selling products
- [ ] Note any accounts with concerning balances
- [ ] Charge all tablets overnight

---

## 🔧 Troubleshooting Quick Reference

### Tablet Can't Connect
1. Check WiFi connection
2. Verify IP address hasn't changed
3. Refresh browser
4. Restart tablet if needed

### Transaction Fails
1. Verify account is selected
2. Check items are in cart
3. Retry checkout
4. If persistent, note transaction manually and enter later

### System Slow
1. Check how many tablets are connected
2. Review number of transactions
3. Close unnecessary browser tabs
4. Restart Docker containers if needed

### Raspberry Pi Unresponsive
1. Check power connection
2. Verify network cable connected (if using Ethernet)
3. Restart Pi (last resort)
4. Check logs after restart

---

## 📅 Mid-Camp Maintenance (Around Day 3-4)

### System Health Check
- [ ] Review system logs for errors
- [ ] Check database size
- [ ] Verify backup files are being created
- [ ] Test backup restoration (on test system if possible)
- [ ] Review disk space on Raspberry Pi
- [ ] Check tablet performance

### Data Review
- [ ] Generate reports for camp directors
- [ ] Review account balances
- [ ] Identify accounts needing attention
- [ ] Check inventory levels
- [ ] Adjust product availability if needed

### Staff Check-in
- [ ] Gather feedback from POS staff
- [ ] Address any recurring issues
- [ ] Provide additional training if needed
- [ ] Answer questions

---

## 🏁 End of Camp

### Final Day Operations
- [ ] Process all remaining transactions
- [ ] Final backup created
- [ ] Export final reports (CSV)
- [ ] Generate account balance report
- [ ] Print list of accounts with negative balances
- [ ] Settle any outstanding balances

### Data Export and Archive
- [ ] Export all transactions to CSV
- [ ] Export all accounts to CSV
- [ ] Export product sales summary
- [ ] Create final database backup
- [ ] Copy all backups to external storage
- [ ] Copy backups to cloud storage (if available)
- [ ] Verify all exports are readable

### System Shutdown
- [ ] Complete final backup
- [ ] Export all data
- [ ] Archive database file
- [ ] Shut down application: `docker-compose down`
- [ ] Power off Raspberry Pi properly
- [ ] Collect all tablets
- [ ] Store equipment safely

### Post-Camp Review
- [ ] Review total revenue
- [ ] Analyze top-selling products
- [ ] Document lessons learned
- [ ] Note any system improvements needed
- [ ] Update documentation with camp-specific notes
- [ ] Prepare feedback for next camp session

---

## 🔐 Security Checklist

- [ ] Admin password is NOT the default
- [ ] Admin password is stored securely
- [ ] Only authorized staff have admin access
- [ ] Tablets are physically secured when not in use
- [ ] Raspberry Pi is in a secure location
- [ ] Network is not exposed to internet
- [ ] Backup files are stored securely
- [ ] Sensitive data is not left on tablets

---

## 📝 Documentation to Maintain

- [ ] Current IP address of Raspberry Pi
- [ ] Admin password (secured)
- [ ] WiFi network name and password
- [ ] Staff training materials
- [ ] Quick reference guides
- [ ] Troubleshooting notes specific to your setup
- [ ] Contact information for technical support
- [ ] Backup schedule and locations

---

## ✅ Final Pre-Camp Verification

Complete this checklist 24 hours before camp starts:

- [ ] All hardware tested and working
- [ ] All software installed and running
- [ ] All accounts created
- [ ] All products entered
- [ ] All tablets configured
- [ ] All staff trained
- [ ] Backups tested
- [ ] Network verified
- [ ] Documentation printed
- [ ] Emergency procedures reviewed

---

## 📞 Emergency Contacts

Document these before camp starts:

- **Technical Support**: _________________________
- **Camp IT Contact**: _________________________
- **System Administrator**: _________________________
- **Backup Person (if primary unavailable)**: _________________________

---

## 💡 Tips for Success

1. **Test Everything Early**: Don't wait until the day before camp
2. **Train Multiple Staff**: Have backup people who know the system
3. **Keep Tablets Charged**: Dead tablets = slow service
4. **Monitor Balances Daily**: Catch issues early
5. **Communication**: Keep staff informed of any changes
6. **Stay Calm**: Most issues have simple solutions
7. **Document Issues**: Note problems for next time
8. **Backup, Backup, Backup**: Never skip daily backups

---

## 🎯 Success Metrics

At the end of camp, you should be able to report:
- Total revenue generated
- Number of transactions processed
- Average transaction value
- Top-selling products
- System uptime percentage
- Staff satisfaction with system
- Zero data loss incidents

---

**Remember**: This system is designed to make snack bar operations easier, not harder. If something isn't working as expected, document it and we'll improve it for next time!