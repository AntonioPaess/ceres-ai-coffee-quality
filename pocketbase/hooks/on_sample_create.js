onRecordCreate((e) => {
  e.record.set('status', 'pending')
  e.next()
}, 'samples')
