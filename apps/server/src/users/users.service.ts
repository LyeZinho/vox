import { Injectable, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as otplib from 'otplib';
import * as QRCode from 'qrcode';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getUser(pubKey: string) {
    return this.prisma.user.findUnique({
      where: { pubKey },
      select: {
        pubKey: true,
        username: true,
        createdAt: true,
        totpEnabled: true,
      },
    });
  }

  async setup2FA(pubKey: string) {
    let user = await this.prisma.user.findUnique({ where: { pubKey } });
    
    if (!user) {
      user = await this.prisma.user.create({ data: { pubKey } });
    }

    const secret = otplib.generateSecret();
    const uri = otplib.generateURI({
      secret,
      issuer: 'tchat',
      label: pubKey.slice(0, 8),
    });
    const qrCode = await QRCode.toDataURL(uri);

    await this.prisma.user.update({
      where: { pubKey },
      data: { totpSecret: secret },
    });

    return {
      secret,
      qrCode,
    };
  }

  async enable2FA(pubKey: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { pubKey } });
    
    if (!user || !user.totpSecret) {
      throw new BadRequestException('2FA not set up');
    }

    const result = await otplib.verify({ token: code, secret: user.totpSecret });

    if (!result.valid) {
      throw new BadRequestException('Invalid code');
    }

    await this.prisma.user.update({
      where: { pubKey },
      data: { totpEnabled: true },
    });

    return { success: true };
  }

  async disable2FA(pubKey: string, code: string) {
    const user = await this.prisma.user.findUnique({ where: { pubKey } });
    
    if (!user || !user.totpEnabled) {
      throw new BadRequestException('2FA not enabled');
    }

    const result = await otplib.verify({ token: code, secret: user.totpSecret! });

    if (!result.valid) {
      throw new BadRequestException('Invalid code');
    }

    await this.prisma.user.update({
      where: { pubKey },
      data: { totpEnabled: false, totpSecret: null },
    });

    return { success: true };
  }

  async get2FAStatus(pubKey: string) {
    const user = await this.prisma.user.findUnique({ where: { pubKey } });
    return { enabled: user?.totpEnabled ?? false };
  }

  async verify2FA(pubKey: string, code: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { pubKey } });
    
    if (!user || !user.totpEnabled || !user.totpSecret) {
      return true;
    }

    const result = await otplib.verify({ token: code, secret: user.totpSecret });
    return result.valid;
  }
}
