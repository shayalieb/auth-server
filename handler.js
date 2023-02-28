
const { google } = require('googleapis');
const OAth2 = google.auth.OAuth2;
const calendar = google.calendar('v3')

//SCOPES is what allows a client to do like read only, update, add and more. For now its read only
const SCOPES = ["https://www.googleapis.com/auth/calendar.readonly"];

const credentials = {
  "client_id": process.env.CLIENT_ID,
  "project_id": process.env.PROJECT_ID,
  "client_secret": process.env.CLIENT_SECRET,
  "calendar_id": process.env.CALENDAR_ID,
  "auth_uri": "https://accounts.google.com/o/oauth2/auth",
  "token_uri": "https://oauth2.googleapis.com/token",
  "auth_provider_x509_cert_url": "https://www.googleapis.com/oauth2/v1/certs",
  "redirect_uris": ["https://shayalieb.github.io/shyMeets/"],
  "javascript_origins": ["https://shayalieb.github.io", "http://localhost:3000"],
};
const { client_id, client_secret, redirect_uris, calendar_id } = credentials;
const oAuth2Client = new google.auth.OAuth2(
  client_id,
  client_secret,
  redirect_uris[0],
  calendar_id
);

//This will generate a URL so the user can get authorization and login
module.exports.getAuthURL = async () => {
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0],
    calendar_id
  );

  const authUrl = oAuth2Client.generateAuthUrl({
    access_type: 'offline',
    scope: SCOPES,
  });

  return {
    statusCode: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Credentials': true
    },
    body: JSON.stringify(
      {
        authUrl: authUrl,
      },
    )
  };
};

//Once the user gets the authorized url, they get the token
module.exports.getAccessToken = async (event) => {
  //Value used to initiate the OAuthClient 
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0],
    calendar_id
  );
  //Decode the authorization code from the URL
  const code = decodeURIComponent(`${event.pathParameters.code}`);

  return new Promise((resolve, reject) => {
    //exchange the auth code for the access token with a Callback
    return oAuth2Client.getToken(code, (err, token) => {
      if (err) {
        return reject(err);
      }
      return resolve(token);
    })
  })
    .then((token) => {
      //get the token
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true,
        },
        body: JSON.stringify(token),
      };
    })
    .catch((err) => {
      console.error(err);
      return {
        statusCode: 500,
        body: JSON.stringify(err),
      };
    });
};

//Once you are authorized and have the token, you can GET the calendar events from the serverless function
module.exports.getCalendarEvents = async (event) => {
  const oAuth2Client = new google.auth.OAuth2(
    client_id,
    client_secret,
    redirect_uris[0],
    calendar_id
  );
  const access_token = decodeURIComponent(`${event.pathParameters.access_token}`);
  oAuth2Client.setCredentials({ access_token });

  return new Promise((resolve, reject) => {
    calendar.events.list(
      {
        calendarId: calendar_id,
        auth: oAuth2Client,
        timeMin: new Date().toISOString(),
        singleEvents: true,
        orderBy: 'startTime',
      },
      (error, response) => {
        if (error) {
          reject(error);
        } else {
          resolve(response)
        }
      }
    );
  })
    .then(results => {
      return {
        statusCode: 200,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true,
        },
        body: JSON.stringify({ events: results.data.items })
      };
    })
    .catch(error => {
      return {
        statusCode: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Credentials': true,
        },
        body: JSON.stringify(error)
      };
    });
};