# HighSchoolTutors Profile Booster
This project is about my journey in pushing my https://highschooltutors.com.au profile to the top of the search results.

## Backstory
Around this time last year I decided to become a high school maths tutor because of my strong foundation and results. I started noticing that in the search results the same people kept getting pushed to the top as I would refresh the page. At some point I also realised that when I updated my profile it would go to the top.

## Instructions
1. Git clone the repo by running 
```bash
git clone https://github.com/maxlebedev1/highschooltutors-profile-booster.git
```
2. Install dependencies by running 
```bash
npm install
```
3. Go to highschooltutors.com.au, and navigate to the profile page. Open the console and switch to the 'Network' tab. Slightly modify your profile description and click on the 'Update' button. Then, copy the request payload with the title as a 5-digit number (your user id).
4. Navigate to `config.json` and replace the values with your own.
5. Update `description.txt` with your desired description.
6. Run the script by running 
```bash
node monitor.js
```

## The "Top Tutor badge"
There are 2 types of badges you can get on highschooltutors.com.au; "Online tutoring", and "Very responsive". Strategically, I didn't receive the "Very responsive" badge by leaving parents on delivered for over a day. Instead, I went to photoshop, copied the exact font and colouring scheme from the website and placed a fake icon on my pfp.

## Disclaimer
I am not responsible for any consequences that may arise from using this script. From when I last read the TOS, everything in this project is legal, but things can change. Use it at your own risk.
