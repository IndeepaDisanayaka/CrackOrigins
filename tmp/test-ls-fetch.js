
const apiKey = "eyJ0eXAiOiJKV1QiLCJhbGciOiJSUzI1NiJ9.eyJhdWQiOiI5NGQ1OWNlZi1kYmI4LTRlYTUtYjE3OC1kMjU0MGZjZDY5MTkiLCJqdGkiOiI2YzNhN2I4ZmI5MWE5ZjA3Y2IzNjA2NGE3OWFjOWJmZmFiZGYyODI4OTQyMTRjNjc2NGVhNDQ3MTY0NGQ0ZDE5MjJhNzk5NjNhM2JmZGI4MSIsImlhdCI6MTc3NTg5OTc4NC41Njk5NTcsIm5iZiI6MTc3NTg5OTc4NC41Njk5NTksImV4cCI6MTc5MTY3NjgwMC4wMTkzOTIsInN1YiI6IjY4NzkzOTYiLCJzY29wZXMiOltdfQ.MlP575vEEUWYBrXcwKEwketCkvXvxP7d7HNqMArdS7wcV1N4mCVKoumz_2MU-vS2cQ6SNVlg6q_MyZjxm6xxO9cpjS88h3EkpO8FvHloLbo9qR5G8bK3qOuhvUzpzg9UFBzVxPXIhc6z_yAJGXqskuFft4LgaOkK-JKso1Kn4Tr1ukjVp9TZw26M5MWpJkFVgTWEdq5h6AuAcZ0j7UzQfvlxqu916FgGHXVBY2VfvuQg0oJvtCuBU03rNjUgD4VqbFm1-GV9Da3CH1uAXoAb_uO8sNJtO7k7L3DvAA-dy4XADZlcqKOcVmhufVZCIdLv2ca9M68VzUGZxHvWZ1-q-4cE4KyGilhkn_ZtrTMMQNoyMNoVEy__8A1D7wdBMxJam6AlSBf0H038VB4sspD_99PLqftRnhurOL16HgdmPbLp5nydQ9G8tVpKnRJgIdwfdz3hVNwkBxTYlBPb91HtpEL5DkowHYXbw0JdteBQ-jwkK3pYkrlCVt-wvoPJNu-eXCUP6Dt7g3oJoPIn6-qgWTFqOHtIpm7gusM8hcKErJD5bNeCJZYqwXy_JEzf73sqkLOY1Tt2qhkqyGKE5OvpxxK7KjADILNCJzwbNsfQov5DYbXfNPp1kYbEfpmixEL9KsX4YxEsRv3pPIKdUxKGcbq1DXCuZLodbzaLFO8kM2I";

async function testFetch() {
  const response = await fetch('https://api.lemonsqueezy.com/v1/stores', {
    headers: {
      'Accept': 'application/vnd.api+json',
      'Content-Type': 'application/vnd.api+json',
      'Authorization': `Bearer ${apiKey}`
    }
  });
  console.log('Status:', response.status);
  const data = await response.json();
  console.log('Body:', JSON.stringify(data, null, 2));
}

testFetch().catch(console.error);
