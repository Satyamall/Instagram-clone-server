// server.js
require('dotenv').config();
const express = require('express');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

app.get('/auth/instagram', (req, res) => {
  const redirect_uri = encodeURIComponent(process.env.REDIRECT_URI);
  const url = `https://api.instagram.com/oauth/authorize
  ?client_id=${process.env.CLIENT_ID}&redirect_uri=${redirect_uri}&response_type=code&
    scope=user_profile,user_media`;
  res.redirect(url);
});

app.get('/auth/instagram/callback', async (req, res) => {
  try {
    const { code } = req.query;
console.log({code})
    const { data } = await axios.post('https://api.instagram.com/oauth/access_token', {
      client_id: process.env.CLIENT_ID,
      client_secret: process.env.CLIENT_SECRET,
      code,
      grant_type: 'authorization_code',
      redirect_uri: process.env.CLIENT_URL+"/dashboard"
    });

    const { access_token, user_id } = data;
    
    const longLivedToken = await axios.get(`https://graph.instagram.com/access_token?grant_type=ig_exchange_token&client_secret=${process.env.CLIENT_SECRET}&access_token=${access_token}`);
    
    res.redirect(`${process.env.CLIENT_URL}/dashboard?token=${longLivedToken.data.access_token}&user_id=${user_id}`);
  } catch (error) {
    console.error('Instagram auth error:', error.response.data);
    res.status(500).json({ error: 'Authentication failed' });
  }
});

app.get('/api/profile', async (req, res) => {
  try {
    const { token, user_id } = req.query;
    const response = await axios.get(`https://graph.instagram.com/${user_id}?fields=id,username,account_type,media_count&access_token=${token}`);
    res.json(response.data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

app.get('/api/media', async (req, res) => {
  try {
    const { token, user_id } = req.query;
    const response = await axios.get(`https://graph.instagram.com/${user_id}/media?fields=id,caption,media_type,media_url,permalink,comments_count,timestamp&access_token=${token}`);
    res.json(response.data.data);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch media' });
  }
});

app.get('/api/comments', async (req, res) => {
    try {
      const { token, mediaId } = req.query;
      const response = await axios.get(
        `https://graph.instagram.com/${mediaId}/comments?fields=id,text,username,timestamp&access_token=${token}`
      );
      res.json(response.data.data);
    } catch (error) {
      console.error('Error fetching comments:', error.response?.data);
      res.status(500).json({ error: 'Failed to fetch comments' });
    }
  });
  
  app.post('/api/comments/reply', async (req, res) => {
    try {
      const { token, commentId, message } = req.body;
      
      const debugResponse = await axios.get(
        `https://graph.instagram.com/debug_token?input_token=${token}&access_token=${process.env.CLIENT_ID}|${process.env.CLIENT_SECRET}`
      );
      
      if (!debugResponse.data.data.scopes.includes('instagram_manage_comments')) {
        return res.status(403).json({ error: 'Missing required permissions' });
      }
  
      const response = await axios.post(
        `https://graph.instagram.com/${commentId}/replies?message=${encodeURIComponent(message)}&access_token=${token}`
      );
      
      res.json(response.data);
    } catch (error) {
      console.error('Error posting reply:', error.response?.data);
      res.status(500).json({ error: 'Failed to post reply' });
    }
  });

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));