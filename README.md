# Tindev: Developer Team Matching Application

## Project Overview

Tindev is a Tinder-like web application designed for developers and creative professionals to find team members for their projects. The application allows users to:

- Create profiles highlighting their specialty and skills
- Swipe through potential teammates based on skills and compatibility
- Form teams through mutual matching
- Communicate with matches via an integrated chat system
- Manage team formation with approval workflows

The application is built using React, Vite, Firebase, and Tailwind CSS, creating a responsive and interactive experience for finding team members in the creative and development community.

## Tech Stack

### Frontend Technologies
- **React 18**: UI library for building the interface
- **Vite**: Build tool and development server
- **React Router**: For navigation between pages
- **Tailwind CSS**: For styling components
- **React Icons**: Icon library

### Backend & Infrastructure
- **Firebase**:
  - Authentication (Google login)
  - Firestore (database)
  - Storage (for profile images)
  - Hosting

### Key Libraries
- **react-swipeable**: For swipe interactions
- **react-tinder-card**: For card-swiping UI
- **react-spring**: For animations

## Application Structure

### Components and Pages

#### Pages
- **Home**: Main swiping interface
- **Login**: User authentication screen
- **Profile**: User profile management
- **Messages**: Chat list and interaction
- **Chat**: Individual conversation view

#### Core Components
- **SimpleSwipeCards**: Main card swiping component
- **Header**: Navigation header with notifications
- **ProtectedRoute**: Authentication wrapper
- **TeamCandidates**: Team formation component
- **MyMatches**: Displays successful matches

### Firebase Data Structure

The application uses Firebase's Firestore with the following main collections:

- **devs**: User profiles including:
  - Basic info (name, photo, bio)
  - Specialty and skills
  - Team interests and matches
  - Current team members
  - Team candidates

- **chats**: Conversations between matched users
  - Messages subcollection
  - Participant references
  - Timestamps

## Key Features and Workflows

### User Authentication

The application uses Firebase's Google Authentication:
- Users sign in with their Google account
- Basic profile information is retrieved from Google
- Additional profile details are stored in Firestore

### Profile Management

Users can:
- Upload a profile photo
- Set their main specialty (Programmer, Artist, etc.)
- Add secondary specialties
- Specify which skills they're looking for in teammates
- Add portfolio links and contact information

### Team Matching System

The matching system works as follows:
1. Users swipe through potential teammates
2. Right swipe indicates interest in teaming up
3. When two users match (mutual right swipes):
   - A chat is created
   - They appear in each other's matches list
   - They can begin team formation

### Team Formation Workflow

Teams are formed through a consent-based process:
1. When users match, they can propose each other for their teams
2. Team members vote on candidates
3. When all team members approve, the candidate joins the team
4. Teams can have up to 5 members with diverse specialties

### Chat System

The application includes a real-time chat system:
- Chat creation upon matching
- Message history preservation
- Last message and timestamp tracking
- User-friendly interface with profile information

## Code Architecture

### State Management

The application uses React's built-in state management with:
- `useState` for component-level state
- `useEffect` for side effects and data fetching
- Real-time updates via Firebase listeners

### Authentication Flow

1. User clicks Google login button
2. Firebase Authentication handles the OAuth flow
3. On successful login, user info is stored/updated in Firestore
4. Protected routes ensure authenticated access

### Data Operations

The app leverages Firebase's Firestore for data operations:
- Real-time listeners with `onSnapshot`
- Transactions for complex team operations
- Batch writes for updating multiple documents

## Implementation Details

### Swipe Functionality

The swipe cards are implemented using:
- React Swipeable for gesture detection
- Animation states for visual feedback
- Firebase operations to record swipe decisions

### Team Matching Algorithm

The matching algorithm considers:
1. Skills that the user is looking for
2. Mutual interest (both users swiped right)
3. Team composition balance (avoiding duplicate specialties)
4. Previous interactions

### Notification System

The app includes:
- Match notifications
- Team candidate notifications
- Message notifications
- Visual indicators in the header

## Setup and Deployment

### Local Development

To set up the project locally:

1. Clone the repository
2. Install dependencies with `npm install`
3. Create a Firebase project and configure credentials
4. Update `src/firebase/config.js` with your Firebase details
5. Run `npm run dev` to start the development server

### Deployment

To deploy the application:

1. Build the project with `npm run build`
2. Deploy to Firebase Hosting with `firebase deploy`

## Future Enhancements

Potential improvements for the application:

1. **Advanced Matching**: Implement AI-based matching suggestions
2. **Project Management**: Add tools for team coordination after matching
3. **Skills Assessment**: Integrate skill verification features
4. **Enhanced Filtering**: Add more filtering options for finding teammates
5. **Video Chat**: Implement video meeting functionality for team discussions

## Firebase Security Rules

Recommended security rules for Firestore:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /devs/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
    
    match /chats/{chatId} {
      allow read, write: if request.auth != null && 
        exists(/databases/$(database)/documents/chats/$(chatId)/participants/$(request.auth.uid));
      
      match /messages/{messageId} {
        allow read, write: if request.auth != null && 
          exists(/databases/$(database)/documents/chats/$(chatId)/participants/$(request.auth.uid));
      }
    }
  }
}
```
