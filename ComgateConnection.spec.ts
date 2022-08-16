import axios from 'axios' // eslint-disable-line import/no-extraneous-dependencies
import ComgateConnection from './ComgateConnection'

describe('ComgateConnection', () => {
  const connection = new ComgateConnection(axios, {
    merchantId: parseInt(process.env.BACKEND__COMGATE_MERCHANT_ID, 10),
    secret: process.env.BACKEND__COMGATE_SECRET,
  })

  it('should create, check and cancel a payment', async () => {
    const payment = await connection.createPayment({ referenceId: 12345, price: 100, label: 'FooBar' })
    expect(payment.redirect).toContain('https://payments.comgate.cz/client/')
    expect(payment.transId).toBeTruthy()
    const paymentStatus = await connection.getPaymentStatus(payment.transId)
    expect(paymentStatus.code).toBe('0')
    expect(paymentStatus.transId).toBe(payment.transId)
    const cancelledResult = await connection.cancelPayment(payment.transId)
    expect(cancelledResult.code).toBe('0')
  })
})
