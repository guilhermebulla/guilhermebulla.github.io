rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    match /pedidos/{doc} {
      allow read: if true;

      allow create: if request.resource.data.keys().hasOnly(['songId','title','artist','requester','requesterKey','status','createdAt','show'])
        && request.resource.data.keys().hasAll(['songId','title','artist','requester','requesterKey','status','createdAt','show'])
        && request.resource.data.status == 'fila'
        && request.resource.data.createdAt is timestamp
        && request.resource.data.songId is int && request.resource.data.songId >= 0
        && request.resource.data.title is string && request.resource.data.title.size() >= 1 && request.resource.data.title.size() <= 100
        && request.resource.data.artist is string && request.resource.data.artist.size() >= 1 && request.resource.data.artist.size() <= 80
        && request.resource.data.requester is string && request.resource.data.requester.size() >= 1 && request.resource.data.requester.size() <= 40
        && request.resource.data.requesterKey is string && request.resource.data.requesterKey.size() >= 1 && request.resource.data.requesterKey.size() <= 40
        && request.resource.data.show is int && request.resource.data.show >= 1;

      allow update, delete: if request.auth != null && request.auth.uid == 'shP9eBMUNzbJi3yrDVekqNRraNt2';
    }

    match /show/{doc} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == 'shP9eBMUNzbJi3yrDVekqNRraNt2';
    }
  }
}
