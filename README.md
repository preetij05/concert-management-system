# Concert Management System

A web-based Concert Management System developed using Node.js, Express.js, MySQL, HTML, CSS, and JavaScript. The system provides separate interfaces for administrators and customers to manage and view concert information.

## Features

### Admin Portal
- Add, view, update, and delete artist information
- Manage artist details such as name and genre
- Manage concert-related information
- Perform database operations through REST APIs

### Customer Portal
- Browse upcoming concerts
- View concert details
- View associated artists and venue information

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Node.js, Express.js
- **Database:** MySQL
- **API:** REST APIs
- **Development Environment:** Visual Studio Code

## Database Design

The system uses a relational MySQL database with tables for:

- `venue` – stores venue information
- `concert` – stores concert details
- `artist` – stores artist information
- `concert_artist` – manages the many-to-many relationship between concerts and artists

### Relationships

- A concert is associated with one venue.
- A concert can have multiple artists.
- An artist can participate in multiple concerts.
- The `concert_artist` table manages the many-to-many relationship between concerts and artists.

## Project Structure

```text
concert-management-system/
│
├── db/
│   └── connection.js
│
├── public/
│   ├── admin/
│   │   ├── dashboard.html
│   │   ├── manage_artists.html
│   │   └── manage_concerts.html
│   │
│   ├── customer/
│   │   ├── browse.html
│   │   └── login.html
│   │
│   ├── images/
│   │   ├── Concert.jpg
│   │   └── crowd.jpg
│   │
│   └── index.html
│
├── routes/
│   ├── adminRoutes.js
│   └── customerRoutes.js
│
├── index.js
├── package.json
├── package-lock.json
└── .gitignore