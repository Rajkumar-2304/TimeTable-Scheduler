# Comprehensive Sample Data & Bulk Delete Features

## New Sample Data Files Created

### faculty_array_complete.json (14 faculty members)
- **8 Computer Science faculty** with different specializations
- 2 Mathematics faculty
- 2 Electronics faculty
- 2 Mechanical faculty
- All with realistic max periods/week (15 for CS, 12 for others)
- Diverse departments to fill entire timetable

### subjects_sample_complete.json (16 subjects)
- **10 Computer Science subjects** (theory + 4 labs with configurable durations)
  - Data Structures, Database Systems, OS, Networks, Web Tech, Engineering
  - Matching labs with 3-period durations
- 3 Mathematics subjects
- 3 Electronics subjects (with Digital Electronics lab)
- Realistic credit hours and periods/week

### groups_sample_complete.json (8 student groups)
- **4 Computer Science groups** (CSE A/B/C/D, Sem 3)
  - 52-60 students per group
- 2 Electronics groups (ECE A/B)
- 2 Mechanical groups (MECH A/B)
- All configured for semester 3

### rooms_sample_complete.json (12 rooms)
- **4 Lab spaces** (Lab A/B/C/D with 35-40 capacity)
- **6 Classrooms** (Class A-F with 50-60 capacity)
- 1 Auditorium (200 capacity)
- 1 Seminar Hall (100 capacity)
- Proper room types and WiFi/equipment features

## New Bulk Delete Feature

Added across **Faculty, Subjects, Groups, and Rooms** components:

### Selection UI:
- **Checkbox on each card** - click to select/deselect individual items
- **"Select All" button** - quickly select/deselect all filtered items
- **"Delete (N)" button** - appears when items are selected; deletes all at once
- **Visual feedback** - selected cards show reduced opacity

### Features:
- Confirmation dialog before bulk deletion
- Success toast notification showing count deleted
- Selection state resets after deletion
- Works with search filters (can select within filtered results)

### Where to Use:
1. **Faculty page** - Mass delete duplicate/test faculty
2. **Subjects page** - Remove unwanted courses
3. **Groups page** - Clear old student groups
4. **Rooms page** - Bulk remove spaces

## How to Test:

1. **Import Complete Sample Data**: Use JsonImporter to paste contents of `*_complete.json` files
2. **Verify Department Alignment**: All CS subjects assigned to CS faculty and CS groups
3. **Test Bulk Delete**: 
   - Navigate to Faculty > click "Select All" > verify count
   - Click "Delete (count)" > confirm > watch items disappear
   - Repeat for other entities

## Timetable Generation Notes:

The complete data set should now:
- Fill Labs: 4 available labs vs 4 lab sessions/week = full utilization
- Fill Classrooms: 6 classrooms vs ~32-36 classroom periods/week = ~6-7 periods/room
- Accommodate 4 CS groups with varied subject combinations
- Distribute load evenly across 8 faculty (CS-heavy with supporting Math/Electronics)

All subjects now respect their `labDuration` field during generation!
