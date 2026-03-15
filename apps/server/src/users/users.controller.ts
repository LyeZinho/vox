import { Controller, Post, Body, Get, Param, UseGuards } from '@nestjs/common';
import { UsersService } from './users.service';
import { SignatureGuard } from '../auth/guards/signature.guard';

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get(':pubKey')
  async getUser(@Param('pubKey') pubKey: string) {
    return this.usersService.getUser(pubKey);
  }

  @Post(':pubKey/2fa/setup')
  @UseGuards(SignatureGuard)
  async setup2FA(@Param('pubKey') pubKey: string) {
    return this.usersService.setup2FA(pubKey);
  }

  @Post(':pubKey/2fa/enable')
  @UseGuards(SignatureGuard)
  async enable2FA(@Param('pubKey') pubKey: string, @Body('code') code: string) {
    return this.usersService.enable2FA(pubKey, code);
  }

  @Post(':pubKey/2fa/disable')
  @UseGuards(SignatureGuard)
  async disable2FA(@Param('pubKey') pubKey: string, @Body('code') code: string) {
    return this.usersService.disable2FA(pubKey, code);
  }

  @Get(':pubKey/2fa/status')
  async get2FAStatus(@Param('pubKey') pubKey: string) {
    return this.usersService.get2FAStatus(pubKey);
  }
}
