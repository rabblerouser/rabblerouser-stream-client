const createConsumer = require('../consumer');

describe('consumer', () => {
  let sandbox;
  let res;
  const header = () => 'secret';
  const settings = { eventAuthToken: 'secret' };

  beforeEach(() => {
    sandbox = sinon.sandbox.create();
    res = {
      status: sinon.stub().returns({ json: sinon.spy() }),
      sendStatus: sinon.spy(),
    };
  });

  afterEach(() => {
    sandbox.restore();
  })

  it('refuses to register an event handler to no event type', () => {
    expect(() => { createConsumer(settings).on('', () => {}) }).to.throw(Error, /No event type defined for handler./);
    expect(() => { createConsumer(settings).on(null, () => {}) }).to.throw(Error, /No event type defined for handler./);
  });

  it('refuses to register event handlers that are not functions', () => {
    expect(() => { createConsumer(settings).on('event-type') }).to.throw(Error, /Invalid event handler./);
    expect(() => { createConsumer(settings).on('event-type', 5) }).to.throw(Error, /Invalid event handler./);
  });

  it('blows up if the request has no body', () => {
    createConsumer(settings)({ header }, res);

    expect(res.status).to.have.been.calledWith(500);
  });

  it('succeeds if there is no handler that matches the given event', () => {
    createConsumer(settings)({ header, body: {} }, res);

    expect(res.sendStatus).to.have.been.calledWith(204);
  });

  it('succeeds and sends the event data when there is a registered handler', () => {
    const consumer = createConsumer(settings);

    const eventHandler = sinon.stub().returns(Promise.resolve());
    consumer.on('some-event-type', eventHandler);

    return consumer({ header, body: { type: 'some-event-type', data: { some: 'data' } } }, res).then(() => {
      expect(eventHandler).to.have.been.calledWith({ some: 'data' });
      expect(res.sendStatus).to.have.been.calledWith(200);
    });
  });

  it('fails if the event handler fails', () => {
    const consumer = createConsumer(settings);

    const eventHandler = sinon.stub().returns(Promise.reject('Error!'));
    consumer.on('some-event-type', eventHandler);

    return consumer({ header, body: { type: 'some-event-type', data: { some: 'data' } } }, res).then(() => {
      expect(eventHandler).to.have.been.calledWith({ some: 'data' });
      expect(res.status).to.have.been.calledWith(500);
      expect(res.status().json).to.have.been.calledWith({ error: 'Error!' });
    });
  });

  it('does not allow the event if the auth header is missing', () => {
    const consumer = createConsumer(settings);
    consumer({ header: () => undefined, body: { type: 'some-event-type', data: { some: 'data' } } }, res);

    expect(res.status).to.have.been.calledWith(401);
  });

  it('does not allow the event if the auth header is wrong', () => {
    const consumer = createConsumer(settings);

    consumer({ header: () => 'wrong', body: { type: 'some-event-type', data: { some: 'data' } } }, res);

    expect(res.status).to.have.been.calledWith(401);
  });
});
