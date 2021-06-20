const functions = require("firebase-functions");
const admin = require("firebase-admin");
const fetch=require("node-fetch")
admin.initializeApp();
const db = admin.firestore();


function add(accumulator, a) {
    return accumulator + a;
}

exports.newUserSignUp = functions.auth.user().onCreate((user) => {
 // Función para setear información en BD a la creación de un usuario
  db.collection("Users").doc(user.uid).set({
    createdAt: new Date(user.metadata.creationTime),
    followers: [],
    follows: [],
    interestCategories: [],
    numReviews: 0,
    userName: "",
    userPhoto: "",
    email: user.email,
    rankUser: "Bronze",
  });
});

exports.UpdateUpponReview = functions.firestore.document('Reviews/{id}').onCreate(async (snap, context) => {
    var data=snap.data()
    const placeid=data.placeid;
  const dataPlace= await db.collection("Places").doc(placeid).get()
  const numReviewsPlace= dataPlace.data().numReviews



  const dataUser= await db.collection("Users").doc(data.userid).get()
  const numReviewsUser= dataUser.data().numReviews

  console.log(numReviewsPlace,numReviewsPlace)
  db.collection("Users").doc(data.userid).update({
    numReviews: numReviewsUser +1,
  });

  const reviewsdata=await db.collection("Reviews").where("placeid", "==", placeid).get()
  const scores=reviewsdata.docs.map((review)=>{return review.data().rank})
  const n=scores.length;
  console.log(scores,n)

  const sum=scores.reduce(add, 0); 

  const avg=sum/n;
  console.log(avg)
  db.collection("Places").doc(placeid).update({
    numReviews: n,
    avgRating: avg,
  });
});


//Notificación cuanto te sigue un usuario
exports.FollowNotification = functions.firestore.document('Users/{user_id}/Followers/{follower_id}').onCreate(async (snapshot, context) => {
  const data = snapshot.data()
  const user_id = context.params.user_id
  const follower_id = context.params.follower_id
  const follower_name = data.username
  
  const userInfo=await db.collection("Users").doc(user_id).get()
  const userData = userInfo.data()
  const tokenPhone = userData.tokenPhone

  //Array ids followers
  var arrayFollowers = userData.followers
  arrayFollowers.push(follower_id)
  arrayFollowers = [...new Set(arrayFollowers)];
  console.log("Array Followers")
  console.log(arrayFollowers)
  //Update Array
  r = await db.collection("Users").doc(user_id).update({
    followers:arrayFollowers
  })


  //Update Array de Cuantos sigue el (follower)
  const followerInfo=await db.collection("Users").doc(follower_id).get()
  const followerData = followerInfo.data()
  var arrayFollows = followerData.follows
  arrayFollows.push(user_id)
  arrayFollows = [...new Set(arrayFollows)]
  //Update Array
  r = await db.collection("Users").doc(follower_id).update({
    follows:arrayFollows
  })

  //Agregar Notificación a Firestore
  r = await db.collection("Users").doc(user_id).collection("Activity").add({
    type: 'follower',
    follower_id: follower_id,
    follower_name:follower_name,
    followerPhoto: data.userPhoto,
    date: data.followDate,
    readed:false,
  })

  //Notification
const message = {
    "to": tokenPhone,
    "body": `Te ha seguido ${follower_name}`,
    "title":"Nuevo Seguidor"
  }

  //Enviar usando API de Expo
  fetch("https://exp.host/--/api/v2/push/send", {
    method: "POST",
    headers: {
      "Accept": "application/Json",
      "Content-Type": "application/json"
    },
    body: JSON.stringify(message)
  }
  ).then((res) => {
    console.log(res)
    console.log("sended!!")
  }).catch((err) => { console.log(err) })
    
})


//Unfollow Function

exports.UnfollowEvent = functions.firestore.document('Users/{user_id}/Followers/{follower_id}').onDelete(async (snapshot, context) => {

  //const data = snapshot.data()
  const user_id = context.params.user_id
  const follower_id = context.params.follower_id

  const userInfo=await db.collection("Users").doc(user_id).get()
  const userData = userInfo.data()

  //Delete follower from user array

  //Array ids followers
  var arrayFollowers = userData.followers
  arrayFollowers=arrayFollowers.filter(function(value){
    return value!=follower_id});
  arrayFollowers = [...new Set(arrayFollowers)];
  console.log("Array Followers")
  console.log(arrayFollowers)
  //Update Array
  r = await db.collection("Users").doc(user_id).update({
    followers:arrayFollowers
  })

  //Update Array de Cuantos sigue el (follower)
  const followerInfo=await db.collection("Users").doc(follower_id).get()
  const followerData = followerInfo.data()
  var arrayFollows = followerData.follows
  arrayFollows=arrayFollows.filter(function(value){
    return value!=user_id});
  arrayFollows = [...new Set(arrayFollows)]

  //Update Array
  r = await db.collection("Users").doc(follower_id).update({
    follows:arrayFollows
  }) 
    
})


//Reply number update

exports.replyEvent = functions.firestore.document('Reviews/{review_id}/Replies/{reply_id}').onCreate(async (snapshot, context) => {
  const data = snapshot.data()
  const review_id = context.params.review_id
  const reviewInfo=await db.collection("Reviews").doc(review_id).get()
  const reviewData = reviewInfo.data()
  var nreplies = reviewData.nreplies
  console.log(nreplies)
  if (nreplies === undefined) {
    nreplies=0
  }
  //Update number replies
  r = await db.collection("Reviews").doc(review_id).update({
    nreplies:nreplies+1
  }) 



})

