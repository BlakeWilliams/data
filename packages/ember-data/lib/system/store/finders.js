import {
  _bind,
  _guard,
  _objectIsAlive
} from "ember-data/system/store/common";

import {
  serializerForAdapter
} from "ember-data/system/store/serializers";


var Promise = Ember.RSVP.Promise;
var map = Ember.EnumerableUtils.map;

export function _find(adapter, store, type, id, record) {
  var snapshot = record._createSnapshot();
  var promise = adapter.find(store, type, id, snapshot);
  var serializer = serializerForAdapter(store, adapter, type);
  var label = "DS: Handle Adapter#find of " + type + " with id: " + id;

  promise = Promise.cast(promise, label);
  promise = _guard(promise, _bind(_objectIsAlive, store));

  return promise.then(function(adapterPayload) {
    Ember.assert("You made a request for a " + type.typeKey + " with id " + id + ", but the adapter's response did not have any data", adapterPayload);
    return store._adapterRun(function() {
      var payload = serializer.extract(store, type, adapterPayload, id, 'find');

      //TODO Optimize
      var record = store.push(type, payload);
      return record.reference;
    });
  }, function(error) {
      record.notFound();
      if (record.isEmpty()) {
        record.unloadRecord();
      }
    throw error;
  }, "DS: Extract payload of '" + type + "'");
}


export function _findMany(adapter, store, type, ids, records) {
  var snapshots = Ember.A(records).invoke('_createSnapshot');
  var promise = adapter.findMany(store, type, ids, snapshots);
  var serializer = serializerForAdapter(store, adapter, type);
  var label = "DS: Handle Adapter#findMany of " + type;

  if (promise === undefined) {
    throw new Error('adapter.findMany returned undefined, this was very likely a mistake');
  }

  promise = Promise.cast(promise, label);
  promise = _guard(promise, _bind(_objectIsAlive, store));

  return promise.then(function(adapterPayload) {
    return store._adapterRun(function() {
      var payload = serializer.extract(store, type, adapterPayload, null, 'findMany');

      Ember.assert("The response from a findMany must be an Array, not " + Ember.inspect(payload), Ember.typeOf(payload) === 'array');

      //TODO Optimize, no need to materialize here
      var records = store.pushMany(type, payload);
      return map(records, function(record) { return record.reference; });
    });
  }, null, "DS: Extract payload of " + type);
}

export function _findHasMany(adapter, store, record, link, relationship) {
  var snapshot = record._createSnapshot();
  var promise = adapter.findHasMany(store, snapshot, link, relationship);
  var serializer = serializerForAdapter(store, adapter, relationship.type);
  var label = "DS: Handle Adapter#findHasMany of " + record + " : " + relationship.type;

  promise = Promise.cast(promise, label);
  promise = _guard(promise, _bind(_objectIsAlive, store));
  promise = _guard(promise, _bind(_objectIsAlive, record));

  return promise.then(function(adapterPayload) {
    return store._adapterRun(function() {
      var payload = serializer.extract(store, relationship.type, adapterPayload, null, 'findHasMany');

      Ember.assert("The response from a findHasMany must be an Array, not " + Ember.inspect(payload), Ember.typeOf(payload) === 'array');

      //TODO Use a non record creating push
      var records = store.pushMany(relationship.type, payload);
      return map(records, function(record) { return record.reference; });
    });
  }, null, "DS: Extract payload of " + record + " : hasMany " + relationship.type);
}

export function _findBelongsTo(adapter, store, record, link, relationship) {
  var snapshot = record._createSnapshot();
  var promise = adapter.findBelongsTo(store, snapshot, link, relationship);
  var serializer = serializerForAdapter(store, adapter, relationship.type);
  var label = "DS: Handle Adapter#findBelongsTo of " + record + " : " + relationship.type;

  promise = Promise.cast(promise, label);
  promise = _guard(promise, _bind(_objectIsAlive, store));
  promise = _guard(promise, _bind(_objectIsAlive, record));

  return promise.then(function(adapterPayload) {
    return store._adapterRun(function() {
      var payload = serializer.extract(store, relationship.type, adapterPayload, null, 'findBelongsTo');

      if (!payload) {
        return null;
      }

      var record = store.push(relationship.type, payload);
      //TODO Optimize
      return record.reference;
    });
  }, null, "DS: Extract payload of " + record + " : " + relationship.type);
}

export function _findAll(adapter, store, type, sinceToken) {
  var promise = adapter.findAll(store, type, sinceToken);
  var serializer = serializerForAdapter(store, adapter, type);
  var label = "DS: Handle Adapter#findAll of " + type;

  promise = Promise.cast(promise, label);
  promise = _guard(promise, _bind(_objectIsAlive, store));

  return promise.then(function(adapterPayload) {
    store._adapterRun(function() {
      var payload = serializer.extract(store, type, adapterPayload, null, 'findAll');

      Ember.assert("The response from a findAll must be an Array, not " + Ember.inspect(payload), Ember.typeOf(payload) === 'array');

      store.pushMany(type, payload);
    });

    store.didUpdateAll(type);
    return store.all(type);
  }, null, "DS: Extract payload of findAll " + type);
}

export function _findQuery(adapter, store, type, query, recordArray) {
  var promise = adapter.findQuery(store, type, query, recordArray);
  var serializer = serializerForAdapter(store, adapter, type);
  var label = "DS: Handle Adapter#findQuery of " + type;

  promise = Promise.cast(promise, label);
  promise = _guard(promise, _bind(_objectIsAlive, store));

  return promise.then(function(adapterPayload) {
    var payload;
    store._adapterRun(function() {
      payload = serializer.extract(store, type, adapterPayload, null, 'findQuery');

      Ember.assert("The response from a findQuery must be an Array, not " + Ember.inspect(payload), Ember.typeOf(payload) === 'array');
    });

    recordArray.load(payload);
    return recordArray;

  }, null, "DS: Extract payload of findQuery " + type);
}
